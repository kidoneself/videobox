import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system/legacy';

const { width } = Dimensions.get('window');
const SOUNDS_DIR = `${FileSystem.documentDirectory}sounds/`;

export default function App() {
  const [sounds, setSounds] = useState({});
  const [isLoopPlay, setIsLoopPlay] = useState(false);
  const [currentPlaying, setCurrentPlaying] = useState(null);
  const [voiceData, setVoiceData] = useState([]);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedVoices, setSelectedVoices] = useState([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollViewRef = useRef(null);

  // 内置语音（使用 Asset 加载）
  const builtInVoices = [
    { 
      id: 'builtin_1', 
      text: '我要验牌！', 
      file: require('./assets/sounds/woyaoyanbpai.mp3'), 
      category: '经典语录', 
      isBuiltIn: true 
    },
    { 
      id: 'builtin_2', 
      text: '给我擦皮鞋', 
      file: require('./assets/sounds/wocaipixie.mp3'), 
      category: '经典语录', 
      isBuiltIn: true 
    },
    { 
      id: 'builtin_3', 
      text: '牌没有问题', 
      file: require('./assets/sounds/paimeiwenti.mp3'), 
      category: '经典语录', 
      isBuiltIn: true 
    },
  ];

  useEffect(() => {
    // 配置音频模式，允许与其他应用（如微信）共存
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,           // 不降低其他音频音量
      playThroughEarpieceAndroid: false,  // 使用扬声器播放
      allowsRecordingIOS: false,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX, // 不混音，独立播放
    }).catch(err => {
      console.log('音频模式设置失败:', err);
    });
    loadVoiceList();
    
    return () => {
      Object.values(sounds).forEach(async (sound) => {
        try {
          await sound.unloadAsync();
        } catch (e) {}
      });
    };
  }, []);

  const loadVoiceList = async () => {
    try {
      const stored = await AsyncStorage.getItem('userVoices');
      const userVoices = stored ? JSON.parse(stored) : [];
      setVoiceData([...builtInVoices, ...userVoices]);
    } catch (error) {
      console.error('加载语音列表失败:', error);
      setVoiceData(builtInVoices);
    }
  };

  const saveUserVoices = async (allVoices) => {
    try {
      const userOnly = allVoices.filter(v => !v.isBuiltIn);
      await AsyncStorage.setItem('userVoices', JSON.stringify(userOnly));
      setVoiceData([...builtInVoices, ...userOnly]);
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  const playSound = async (id, source, isBuiltIn) => {
    try {
      // 如果在编辑模式，则切换选中状态
      if (editingCategory) {
        setSelectedVoices(prev => {
          if (prev.includes(id)) {
            return prev.filter(vid => vid !== id);
          } else {
            return [...prev, id];
          }
        });
        return;
      }

      // 如果点击的是正在播放的，则停止播放
      if (currentPlaying === id) {
        if (sounds[id]) {
          await sounds[id].stopAsync();
          await sounds[id].unloadAsync();
          setSounds(prev => {
            const newSounds = { ...prev };
            delete newSounds[id];
            return newSounds;
          });
        }
        setCurrentPlaying(null);
        return;
      }

      // 停止当前播放
      if (currentPlaying && sounds[currentPlaying]) {
        try {
          await sounds[currentPlaying].stopAsync();
          await sounds[currentPlaying].unloadAsync();
          setSounds(prev => {
            const newSounds = { ...prev };
            delete newSounds[currentPlaying];
            return newSounds;
          });
        } catch (e) {}
      }

      // 创建新的音频对象
      const { sound: newSound } = await Audio.Sound.createAsync(
        isBuiltIn ? source : { uri: source },
        { shouldPlay: true, isLooping: isLoopPlay }
      );

      setSounds(prev => ({ ...prev, [id]: newSound }));
      setCurrentPlaying(id);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish && !isLoopPlay) {
          setCurrentPlaying(null);
        }
      });
    } catch (error) {
      console.error('播放音频出错:', error);
      Alert.alert('错误', '播放失败: ' + error.message);
    }
  };

  const stopAllSounds = async () => {
    try {
      for (const [id, sound] of Object.entries(sounds)) {
        try {
          await sound.stopAsync();
          await sound.unloadAsync();
        } catch (e) {}
      }
      setSounds({});
      setCurrentPlaying(null);
    } catch (error) {
      console.error('停止失败:', error);
    }
  };

  const showImportTutorial = () => {
    Alert.alert(
      '导入语音包教程',
      '支持两种方式：\n\n' +
      '1. 导入ZIP压缩包\n' +
      '   • 将多个MP3文件打包成ZIP\n' +
      '   • ZIP文件名将作为分类名\n' +
      '   • 例如："搞笑语音.zip"\n\n' +
      '2. 导入单个音频文件\n' +
      '   • 支持MP3/M4A/WAV/AAC格式\n' +
      '   • 文件名将作为语音名称\n' +
      '   • 会自动归类到"导入的语音"',
      [
        { text: '取消', style: 'cancel' },
        { text: '开始导入', onPress: () => importVoicePack() }
      ]
    );
  };

  const importVoicePack = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'audio/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fileUri = result.assets[0].uri;
      const fileName = result.assets[0].name;
      const mimeType = result.assets[0].mimeType || '';

      // 确保目录存在
      const dirInfo = await FileSystem.getInfoAsync(SOUNDS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(SOUNDS_DIR, { intermediates: true });
      }

      // 判断是ZIP还是音频文件
      if (fileName.toLowerCase().endsWith('.zip') || mimeType.includes('zip')) {
        // 处理ZIP文件
        Alert.alert('处理中', '正在解压，请稍候...');
        
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const zip = await JSZip.loadAsync(base64, { base64: true });
        const zipName = fileName.replace(/\.zip$/i, '') || '导入';
        const newVoices = [];
        let count = 0;

        for (const [filename, file] of Object.entries(zip.files)) {
          if (file.dir) continue;
          
          const ext = filename.toLowerCase().match(/\.(mp3|m4a|wav|aac)$/);
          if (!ext) continue;

          try {
            const content = await file.async('base64');
            const timestamp = Date.now() + count;
            const destPath = `${SOUNDS_DIR}${timestamp}${ext[0]}`;

            await FileSystem.writeAsStringAsync(destPath, content, {
              encoding: FileSystem.EncodingType.Base64,
            });

            const baseName = filename.split('/').pop().replace(/\.[^.]+$/, '');

            newVoices.push({
              id: `imported_${timestamp}`,
              text: baseName,
              file: destPath,
              category: zipName,
              isBuiltIn: false,
            });

            count++;
          } catch (e) {
            console.error(`处理 ${filename} 失败:`, e);
          }
        }

        if (newVoices.length > 0) {
          await saveUserVoices([...voiceData, ...newVoices]);
          Alert.alert('成功', `已导入 ${newVoices.length} 个语音到分类 "${zipName}"`);
        } else {
          Alert.alert('提示', 'ZIP中没有找到音频文件');
        }
      } else {
        // 处理单个音频文件
        const ext = fileName.toLowerCase().match(/\.(mp3|m4a|wav|aac)$/);
        if (!ext) {
          Alert.alert('错误', '不支持的文件格式');
          return;
        }

        const base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const timestamp = Date.now();
        const destPath = `${SOUNDS_DIR}${timestamp}${ext[0]}`;

        await FileSystem.writeAsStringAsync(destPath, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const baseName = fileName.replace(/\.[^.]+$/, '');

        const newVoice = {
          id: `imported_${timestamp}`,
          text: baseName,
          file: destPath,
          category: '导入的语音',
          isBuiltIn: false,
        };

        await saveUserVoices([...voiceData, newVoice]);
        Alert.alert('成功', `已导入语音 "${baseName}"`);
      }
    } catch (error) {
      console.error('导入失败:', error);
      Alert.alert('错误', '导入失败: ' + error.message);
    }
  };

  const openNetdiskLink = () => {
    Alert.alert(
      '选择网盘',
      '请选择下载方式',
      [
        {
          text: '夸克网盘',
          onPress: () => {
            const quarkUrl = 'https://pan.quark.cn/s/c5a45d2f352e';
            Linking.openURL(quarkUrl).catch(() => {
              Alert.alert('提示', '无法打开夸克网盘，请检查是否已安装夸克APP');
            });
          }
        },
        {
          text: '百度网盘',
          onPress: () => {
            const baiduUrl = 'https://pan.baidu.com/s/19q117AR6Lg5eTtswEc-0zg?pwd=yyds';
            Linking.openURL(baiduUrl).catch(() => {
              Alert.alert('提示', '无法打开百度网盘');
            });
          }
        },
        {
          text: '取消',
          style: 'cancel'
        }
      ]
    );
  };

  const deleteVoice = (id) => {
    const voice = voiceData.find(v => v.id === id);
    if (voice?.isBuiltIn) {
      Alert.alert('提示', '内置语音不能删除');
      return;
    }

    Alert.alert('确认删除', '确定要删除这条语音吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            if (voice?.file) {
              await FileSystem.deleteAsync(voice.file, { idempotent: true });
            }
            const updated = voiceData.filter(v => v.id !== id);
            await saveUserVoices(updated);
            Alert.alert('成功', '已删除');
          } catch (error) {
            console.error('删除失败:', error);
            Alert.alert('错误', '删除失败');
          }
        },
      },
    ]);
  };

  const groupedVoices = voiceData.reduce((acc, voice) => {
    if (!acc[voice.category]) {
      acc[voice.category] = [];
    }
    acc[voice.category].push(voice);
    return acc;
  }, {});

  const toggleCategory = (category) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const deleteCategory = (category) => {
    const voices = groupedVoices[category];
    const hasBuiltIn = voices.some(v => v.isBuiltIn);
    
    if (hasBuiltIn) {
      Alert.alert('提示', '内置分类不能删除');
      return;
    }

    Alert.alert(
      '删除分类',
      `确定要删除分类"${category}"及其下所有语音（${voices.length}个）吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              // 删除该分类下所有音频文件
              for (const voice of voices) {
                if (voice.file && typeof voice.file === 'string') {
                  try {
                    await FileSystem.deleteAsync(voice.file, { idempotent: true });
                  } catch (e) {
                    console.log('删除文件失败:', e);
                  }
                }
              }
              
              // 从列表中移除该分类的所有语音
              const updated = voiceData.filter(v => v.category !== category);
              await saveUserVoices(updated);
              Alert.alert('成功', `已删除分类"${category}"`);
            } catch (error) {
              console.error('删除分类失败:', error);
              Alert.alert('错误', '删除失败');
            }
          },
        },
      ]
    );
  };

  const startEditing = (category) => {
    setEditingCategory(category);
    setSelectedVoices([]);
  };

  const cancelEditing = () => {
    setEditingCategory(null);
    setSelectedVoices([]);
  };

  const deleteSelected = async () => {
    if (selectedVoices.length === 0) {
      Alert.alert('提示', '请先选择要删除的语音');
      return;
    }

    Alert.alert(
      '删除语音',
      `确定要删除选中的 ${selectedVoices.length} 个语音吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              // 删除文件
              for (const id of selectedVoices) {
                const voice = voiceData.find(v => v.id === id);
                if (voice?.file && typeof voice.file === 'string') {
                  try {
                    await FileSystem.deleteAsync(voice.file, { idempotent: true });
                  } catch (e) {
                    console.log('删除文件失败:', e);
                  }
                }
              }

              // 从列表中移除
              const updated = voiceData.filter(v => !selectedVoices.includes(v.id));
              await saveUserVoices(updated);
              
              setEditingCategory(null);
              setSelectedVoices([]);
              Alert.alert('成功', `已删除 ${selectedVoices.length} 个语音`);
            } catch (error) {
              console.error('删除失败:', error);
              Alert.alert('错误', '删除失败');
            }
          },
        },
      ]
    );
  };

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollTop(offsetY > 300);
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const openPermissionSettings = () => {
    Alert.alert(
      '开启悬浮窗权限',
      '即将跳转到应用设置页面，请手动开启"悬浮窗权限"或"显示在其他应用上层"',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '去设置',
          onPress: () => {
            if (Platform.OS === 'android') {
              Linking.openSettings().catch(() => {
                Alert.alert('提示', '无法打开设置，请手动前往：设置 → 应用 → 搞怪语音盒 → 权限');
              });
            } else {
              Alert.alert('提示', 'iOS系统无需此权限');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Text style={styles.title}>搞怪语音盒</Text>

        {/* 控制区 */}
        <View style={styles.controlSection}>
          <View style={styles.controlRow}>
            <Text style={styles.label}>循环播放:</Text>
            <Switch
              value={isLoopPlay}
              onValueChange={setIsLoopPlay}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={isLoopPlay ? '#007AFF' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity style={styles.stopButton} onPress={stopAllSounds}>
            <Text style={styles.stopButtonText}>⏹️ 停止所有音效</Text>
          </TouchableOpacity>
        </View>

        {/* 导入按钮 */}
        <View style={styles.importButtonsRow}>
          <TouchableOpacity style={styles.downloadButton} onPress={openNetdiskLink}>
            <Text style={styles.downloadButtonText}>下载语音包</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.importButton} onPress={showImportTutorial}>
            <Text style={styles.importButtonText}>导入语音包</Text>
          </TouchableOpacity>
        </View>

        {/* 语音列表 */}
        {Object.entries(groupedVoices).map(([category, voices]) => {
          const hasBuiltIn = voices.some(v => v.isBuiltIn);
          const isEditing = editingCategory === category;
          
          return (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categoryHeaderRow}>
                <TouchableOpacity 
                  style={styles.categoryHeader}
                  onPress={() => toggleCategory(category)}
                >
                  <Text style={styles.categoryTitle}>
                    {collapsedCategories[category] ? '▶' : '▼'} {category}
                  </Text>
                  <Text style={styles.categoryCount}>({voices.length})</Text>
                </TouchableOpacity>
                
                {!hasBuiltIn && !collapsedCategories[category] && (
                  <View style={styles.categoryActions}>
                    {!isEditing ? (
                      <>
                        <TouchableOpacity 
                          style={styles.editButton}
                          onPress={() => startEditing(category)}
                        >
                          <Text style={styles.editButtonText}>编辑</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.deleteButton}
                          onPress={() => deleteCategory(category)}
                        >
                          <Text style={styles.deleteButtonText}>删除</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity 
                          style={styles.cancelButton}
                          onPress={cancelEditing}
                        >
                          <Text style={styles.cancelButtonText}>取消</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.confirmDeleteButton}
                          onPress={deleteSelected}
                        >
                          <Text style={styles.confirmDeleteButtonText}>
                            删除({selectedVoices.length})
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
              
              {!collapsedCategories[category] && (
                <View style={styles.voiceGrid}>
                  {voices.map((voice) => (
                    <TouchableOpacity
                      key={voice.id}
                      style={[
                        styles.voiceButton,
                        currentPlaying === voice.id && styles.voiceButtonActive,
                        isEditing && selectedVoices.includes(voice.id) && styles.voiceButtonSelected,
                      ]}
                      onPress={() => playSound(voice.id, voice.file, voice.isBuiltIn)}
                    >
                      <Text
                        style={[
                          styles.voiceButtonText,
                          currentPlaying === voice.id && styles.voiceButtonTextActive,
                          isEditing && selectedVoices.includes(voice.id) && styles.voiceButtonTextSelected,
                        ]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {voice.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* 使用说明 */}
        <View style={styles.instructionSection}>
          <Text style={styles.sectionTitle}>📖 使用说明</Text>
          <Text style={styles.importantText}>
            ⚠️ 本程序不联网，所有数据本地存储{'\n'}
            💡 需开启悬浮窗权限以支持后台播放
          </Text>
          
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={openPermissionSettings}
          >
            <Text style={styles.permissionButtonText}>🔓 开启悬浮窗权限</Text>
          </TouchableOpacity>

          <Text style={styles.instructionText}>
            • 点击语音按钮播放，再次点击停止{'\n'}
            • 点击"下载语音包"可获取更多语音{'\n'}
            • 点击"导入语音包"可导入ZIP或MP3{'\n'}
            • 点击"编辑"可批量删除语音
          </Text>
        </View>
      </ScrollView>

      {/* 回到顶部按钮 */}
      {showScrollTop && (
        <TouchableOpacity 
          style={styles.scrollTopButton}
          onPress={scrollToTop}
        >
          <Text style={styles.scrollTopText}>↑</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e0e0e0',
    textAlign: 'center',
    marginBottom: 25,
    marginTop: 20,
  },
  controlSection: {
    backgroundColor: '#16213e',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#e0e0e0',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: '#fff',
    fontSize: 16,
    width: 100,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  stopButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  importButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  downloadButton: {
    flex: 1,
    backgroundColor: '#0ea5e9',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  importButton: {
    flex: 1,
    backgroundColor: '#8b5cf6',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#60a5fa',
  },
  categoryCount: {
    fontSize: 14,
    color: '#94a3b8',
    marginLeft: 8,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#64748b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  confirmDeleteButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  voiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  voiceButton: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 10,
    width: (width - 56) / 3,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  voiceButtonActive: {
    backgroundColor: '#2563eb',
  },
  voiceButtonSelected: {
    backgroundColor: '#dc2626',
  },
  voiceButtonText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    numberOfLines: 2,
  },
  voiceButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  voiceButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  instructionSection: {
    backgroundColor: '#16213e',
    borderRadius: 15,
    padding: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#60a5fa',
    marginBottom: 10,
  },
  importantText: {
    color: '#fbbf24',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  instructionText: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 24,
  },
  scrollTopButton: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  scrollTopText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
