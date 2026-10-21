import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { File } from 'expo-file-system';
import { Folder, Plus, Trash2, Lock, X, Download, Share2, FileText, Play, Settings } from 'lucide-react-native';
import {
  AddSource,
  Category,
  VaultItem,
  addToVault,
  categories,
  deleteFromVault,
  getAllVaultItems,
  getDecryptedUri,
  getVaultItems,
} from '../utils/storage';
import { withExternalActivity } from '../security/externalActivity';

interface VaultProps {
  onLock: () => void;
  onOpenSettings: () => void;
  // Resets the inactivity timer; Modal content is outside the root touch handler.
  onActivity: () => void;
}

const PLAINTEXT_WARNING =
  'Files leaving the vault are no longer encrypted and can be seen by other apps.';

const Thumbnail: React.FC<{ item: VaultItem }> = ({ item }) => {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    if (item.category !== 'Photos') return;
    let cancelled = false;
    getDecryptedUri(item)
      .then((decrypted) => !cancelled && setUri(decrypted))
      .catch((error) => console.error('Failed to decrypt thumbnail', error));
    return () => {
      cancelled = true;
    };
  }, [item]);

  if (item.category === 'Photos') {
    return uri ? (
      <Image source={{ uri }} style={styles.thumbnail} contentFit="cover" cachePolicy="none" />
    ) : (
      <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
        <ActivityIndicator color="#666" />
      </View>
    );
  }
  return (
    <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
      {item.category === 'Videos' ? <Play color="#fff" size={30} /> : <FileText color="#fff" size={30} />}
      <Text style={styles.thumbnailName} numberOfLines={1}>
        {item.name}
      </Text>
    </View>
  );
};

const VideoPreview: React.FC<{ uri: string; style: object }> = ({ uri, style }) => {
  const player = useVideoPlayer(uri, (p) => p.play());
  return (
    <VideoView
      player={player}
      style={style}
      nativeControls
      contentFit="contain"
      allowsPictureInPicture={false}
    />
  );
};

const Vault: React.FC<VaultProps> = ({ onLock, onOpenSettings, onActivity }) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [selectedCategory, setSelectedCategory] = useState<Category>('Photos');
  const [items, setItems] = useState<VaultItem[]>([]);
  const [preview, setPreview] = useState<VaultItem | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setItems(await getVaultItems(selectedCategory));
  }, [selectedCategory]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    setPreviewUri(null);
    if (!preview) return;
    let cancelled = false;
    getDecryptedUri(preview)
      .then((uri) => !cancelled && setPreviewUri(uri))
      .catch((error) => {
        console.error(error);
        Alert.alert('Error', 'This file could not be decrypted. It may be damaged.');
        setPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [preview]);

  const pickSources = async (): Promise<AddSource[]> => {
    if (selectedCategory === 'Documents') {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });
      return result.canceled
        ? []
        : result.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType }));
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: selectedCategory === 'Photos' ? 'images' : 'videos',
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 1,
    });
    return result.canceled
      ? []
      : result.assets.map((a) => ({ uri: a.uri, name: a.fileName, mimeType: a.mimeType }));
  };

  const handleAddFile = async () => {
    try {
      const sources = await withExternalActivity(pickSources);
      for (let i = 0; i < sources.length; i++) {
        setBusy(`Encrypting ${i + 1} of ${sources.length}…`);
        await addToVault(sources[i], selectedCategory);
      }
      if (sources.length > 0) {
        Alert.alert(
          'Added to vault',
          'The files are now encrypted in the vault. Remember to delete the originals from your gallery or files app.',
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to add file.');
    } finally {
      setBusy(null);
      loadItems();
    }
  };

  const confirmPlaintext = (title: string, action: () => void) =>
    Alert.alert(title, PLAINTEXT_WARNING, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: action },
    ]);

  const handleOpenFile = (item: VaultItem) =>
    confirmPlaintext('Open outside the vault?', async () => {
      try {
        const uri = await getDecryptedUri(item);
        await withExternalActivity(async () => {
          if (Platform.OS === 'android') {
            try {
              await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                data: new File(uri).contentUri,
                type: item.mimeType,
                flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
              });
              return;
            } catch {
              // No app can view it; fall back to the share sheet.
            }
          }
          await Sharing.shareAsync(uri, { mimeType: item.mimeType });
        });
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Could not open or share this file.');
      }
    });

  const saveToGallery = async (targets: VaultItem[]) => {
    const { status } = await withExternalActivity(() => MediaLibrary.requestPermissionsAsync(true));
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need permission to save files to your gallery.');
      return;
    }
    for (let i = 0; i < targets.length; i++) {
      setBusy(`Exporting ${i + 1} of ${targets.length}…`);
      await MediaLibrary.Asset.create(await getDecryptedUri(targets[i]));
    }
    Alert.alert('Success', targets.length > 1 ? 'Files saved to gallery!' : 'File saved to gallery!');
  };

  const handleDownload = (item: VaultItem) =>
    confirmPlaintext('Save to gallery?', async () => {
      try {
        await saveToGallery([item]);
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Failed to save file.');
      } finally {
        setBusy(null);
      }
    });

  const handleExportAll = async () => {
    const all = await getAllVaultItems();
    if (all.length === 0) {
      Alert.alert('Empty', 'No files to export.');
      return;
    }
    const media = all.filter((item) => item.category !== 'Documents');

    Alert.alert('Export All', `You have ${all.length} files. ${PLAINTEXT_WARNING}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Share One by One',
        onPress: async () => {
          try {
            for (const item of all) {
              const uri = await getDecryptedUri(item);
              await withExternalActivity(() => Sharing.shareAsync(uri, { mimeType: item.mimeType }));
            }
          } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to share files.');
          }
        },
      },
      ...(media.length > 0
        ? [
            {
              text: `Save ${media.length} Photos/Videos to Gallery`,
              onPress: async () => {
                try {
                  await saveToGallery(media);
                } catch (error) {
                  console.error(error);
                  Alert.alert('Error', 'Failed to export files.');
                } finally {
                  setBusy(null);
                }
              },
            },
          ]
        : []),
    ]);
  };

  const handleDelete = (item: VaultItem) => {
    Alert.alert('Delete File', 'Are you sure you want to delete this file permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteFromVault(item);
          if (preview?.id === item.id) setPreview(null);
          loadItems();
        },
      },
    ]);
  };

  const renderPreview = () => {
    if (!preview) return null;
    if (!previewUri) return <ActivityIndicator size="large" color="#f1a33c" />;
    switch (preview.category) {
      case 'Photos':
        return <Image source={{ uri: previewUri }} style={{ width, height }} contentFit="contain" cachePolicy="none" />;
      case 'Videos':
        return <VideoPreview uri={previewUri} style={{ width, height: height * 0.8 }} />;
      case 'Documents':
        return (
          <View style={styles.filePreviewPlaceholder}>
            <FileText color="#fff" size={100} />
            <Text style={styles.fileName}>{preview.name}</Text>
            <TouchableOpacity style={styles.openButton} onPress={() => handleOpenFile(preview)}>
              <Text style={styles.openButtonText}>Open Document</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onLock} accessibilityLabel="Lock vault">
          <Lock color="#fff" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secret Vault</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onOpenSettings} style={styles.headerIcon} accessibilityLabel="Security settings">
            <Settings color="#fff" size={22} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExportAll} style={styles.headerIcon} accessibilityLabel="Export all">
            <Share2 color="#fff" size={22} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAddFile} style={styles.headerIcon} accessibilityLabel="Add files">
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

      {busy ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#f1a33c" />
          <Text style={styles.busyText}>{busy}</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Folder color="#444" size={80} />
          <Text style={styles.emptyText}>No files in this category</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={3}
          renderItem={({ item }) => (
            <View style={styles.fileContainer}>
              <TouchableOpacity style={styles.thumbnailTouch} onPress={() => setPreview(item)}>
                <Thumbnail item={item} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
                <Trash2 color="#fff" size={16} />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 5 }]}
        />
      )}

      <Modal
        visible={!!preview}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreview(null)}
      >
        <View style={styles.modalContainer} onTouchStart={onActivity}>
          <View style={[styles.modalHeader, { top: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => setPreview(null)}>
              <X color="#fff" size={30} />
            </TouchableOpacity>
            {preview && (
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => handleOpenFile(preview)} style={{ marginRight: 20 }}>
                  <Share2 color="#fff" size={26} />
                </TouchableOpacity>
                {preview.category !== 'Documents' && (
                  <TouchableOpacity onPress={() => handleDownload(preview)}>
                    <Download color="#fff" size={26} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
          {renderPreview()}
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
  busyText: {
    color: '#888',
    marginTop: 15,
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
    flex: 1 / 3,
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
  thumbnailName: {
    color: '#aaa',
    fontSize: 10,
    marginTop: 6,
    paddingHorizontal: 6,
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
