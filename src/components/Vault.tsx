import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, Image, TouchableOpacity, Alert, Modal, Dimensions, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Video, ResizeMode } from 'expo-av';
import { Camera, Folder, Plus, Trash2, ArrowLeft, X, Download, Share2, FileText, Play } from 'lucide-react-native';
import { getVaultFiles, addToVault, deleteFromVault, Category, categories, getAllVaultFiles } from '../utils/storage';

interface VaultProps {
  onLock: () => void;
}

const { width, height } = Dimensions.get('window');

const Vault: React.FC<VaultProps> = ({ onLock }) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>('Photos');
  const [files, setFiles] = useState<string[]>([]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [selectedCategory]);

  const loadFiles = async () => {
    const vaultFiles = await getVaultFiles(selectedCategory);
    setFiles(vaultFiles);
  };

  const handleAddFile = async () => {
    try {
      if (selectedCategory === 'Documents') {
        const result = await DocumentPicker.getDocumentAsync({
          type: '*/*',
          copyToCacheDirectory: true,
        });

        if (!result.canceled) {
          const asset = result.assets[0];
          await addToVault(asset.uri, 'Documents');
          loadFiles();
        }
      } else {
        const mediaTypes = selectedCategory === 'Photos' 
          ? ImagePicker.MediaTypeOptions.Images 
          : ImagePicker.MediaTypeOptions.Videos;

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: mediaTypes,
          allowsEditing: false,
          quality: 1,
        });

        if (!result.canceled) {
          const asset = result.assets[0];
          await addToVault(asset.uri, selectedCategory);
          loadFiles();
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to pick file.');
    }
  };

  const handleOpenFile = async (uri: string) => {
    try {
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        });
      } else {
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      console.error(error);
      // Fallback to sharing if intent fails
      try {
        await Sharing.shareAsync(uri);
      } catch (shareError) {
        Alert.alert('Error', 'Could not open or share this file.');
      }
    }
  };

  const handleDownload = async (uri: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need permission to save photos to your gallery.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Success', 'File saved to gallery!');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save file.');
    }
  };

  const handleExportAll = async () => {
    try {
      setLoading(true);
      const allFiles = await getAllVaultFiles();
      if (allFiles.length === 0) {
        Alert.alert('Empty', 'No files to export.');
        return;
      }

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Error', 'Sharing is not available on this device.');
        return;
      }

      // Note: Sharing multiple files at once can be tricky depending on OS.
      // For now, we share them one by one or suggest a zip if we had a zip util.
      // Most common approach for "Export All" without zip is to share the first one or prompt.
      // Improved: Use sharing on individual files or loop (OS specific behavior varies).
      
      Alert.alert(
        'Export All',
        `You have ${allFiles.length} files. How would you like to export?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Share One by One', 
            onPress: async () => {
              for (const uri of allFiles) {
                await Sharing.shareAsync(uri);
              }
            }
          },
          {
            text: 'Save All to Gallery',
            onPress: async () => {
              const { status } = await MediaLibrary.requestPermissionsAsync();
              if (status === 'granted') {
                for (const uri of allFiles) {
                  await MediaLibrary.saveToLibraryAsync(uri);
                }
                Alert.alert('Success', 'All files saved to gallery!');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to export files.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (uri: string) => {
    Alert.alert(
      'Delete File',
      'Are you sure you want to delete this file permanently?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await deleteFromVault(uri);
            if (previewUri === uri) setPreviewUri(null);
            loadFiles();
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onLock}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secret Vault</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleExportAll} style={styles.headerIcon}>
            <Share2 color="#fff" size={22} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAddFile} style={styles.headerIcon}>
            <Plus color="#fff" size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.categoryBar}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryTab, selectedCategory === cat && styles.activeTab]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.categoryText, selectedCategory === cat && styles.activeCategoryText]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#f1a33c" />
        </View>
      ) : files.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Folder color="#444" size={80} />
          <Text style={styles.emptyText}>No files in this category</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          keyExtractor={(item) => item}
          numColumns={3}
          renderItem={({ item }) => (
            <View style={styles.fileContainer}>
              <TouchableOpacity 
                style={styles.thumbnailTouch}
                onPress={() => setPreviewUri(item)}
              >
                {selectedCategory === 'Photos' ? (
                  <Image source={{ uri: item }} style={styles.thumbnail} />
                ) : (
                  <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
                    {selectedCategory === 'Videos' ? (
                      <Play color="#fff" size={30} />
                    ) : (
                      <FileText color="#fff" size={30} />
                    )}
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item)}
              >
                <Trash2 color="#fff" size={16} />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal
        visible={!!previewUri}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPreviewUri(null)}>
              <X color="#fff" size={30} />
            </TouchableOpacity>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={() => previewUri && handleOpenFile(previewUri)}
                style={{ marginRight: 20 }}
              >
                <Share2 color="#fff" size={26} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => previewUri && handleDownload(previewUri)}>
                <Download color="#fff" size={26} />
              </TouchableOpacity>
            </View>
          </View>
          {previewUri && (
            selectedCategory === 'Photos' ? (
              <Image 
                source={{ uri: previewUri }} 
                style={styles.fullImage} 
                resizeMode="contain"
              />
            ) : selectedCategory === 'Videos' ? (
              <Video
                source={{ uri: previewUri }}
                rate={1.0}
                volume={1.0}
                isMuted={false}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                useNativeControls
                style={styles.fullVideo}
              />
            ) : (
              <View style={styles.filePreviewPlaceholder}>
                <FileText color="#fff" size={100} />
                <Text style={styles.fileName}>
                  {previewUri.split('/').pop()}
                </Text>
                <TouchableOpacity 
                  style={styles.openButton}
                  onPress={() => handleOpenFile(previewUri)}
                >
                  <Text style={styles.openButtonText}>Open Document</Text>
                </TouchableOpacity>
              </View>
            )
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1f1f1f',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginLeft: 20,
  },
  categoryBar: {
    flexDirection: 'row',
    backgroundColor: '#1f1f1f',
    paddingBottom: 10,
  },
  categoryTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#f1a33c',
  },
  categoryText: {
    color: '#888',
    fontSize: 14,
  },
  activeCategoryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#444',
    marginTop: 10,
    fontSize: 16,
  },
  listContent: {
    padding: 5,
  },
  fileContainer: {
    flex: 1/3,
    aspectRatio: 1,
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailTouch: {
    flex: 1,
  },
  thumbnail: {
    flex: 1,
    backgroundColor: '#333',
  },
  deleteButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 5,
    borderRadius: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullImage: {
    width: width,
    height: height,
  },
  fullVideo: {
    width: width,
    height: height * 0.8,
  },
  placeholderThumbnail: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2c2c2c',
  },
  filePreviewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fileName: {
    color: '#fff',
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
  },
  openButton: {
    marginTop: 30,
    backgroundColor: '#f1a33c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  openButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default Vault;
