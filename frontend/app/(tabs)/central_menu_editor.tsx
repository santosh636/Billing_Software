// frontend/app/(tabs)/central_menu_editor.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { databaseService, MenuItem } from '../../services/DatabaseService';

const PRIMARY_COLOR = '#006437';
const LIGHT_GRAY = '#f5f5f5';
const DARK_GRAY = '#333';

// *** Only ever use CENTRAL_ID here ***
const CENTRAL_ID = 'FR-CENTRAL';

export default function CentralMenuEditor() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState({ name: '', price: '', category: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  // hardware back → central_settings
  useFocusEffect(
    React.useCallback(() => {
      const onBack = () => {
        router.replace('/central_settings');
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [router])
  );

  // fetch once on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const items = await databaseService.getMenuItems(CENTRAL_ID);
      setProducts(items);
    } catch (err) {
      console.error('Menu load error', err);
      Alert.alert('Error', 'Failed to load menu items.');
    }
  }

  async function handleAdd() {
    if (!name.trim() || !price.trim() || !category.trim()) {
      return Alert.alert('Validation', 'Please fill all fields.');
    }
    const p = parseFloat(price);
    if (isNaN(p)) {
      return Alert.alert('Validation', 'Price must be a number.');
    }
    try {
      await databaseService.addMenuItem(
        { name: name.trim(), price: p, category: category.trim(), franchise_id: CENTRAL_ID }
      );
      setName(''); setPrice(''); setCategory('');
      setIsAdding(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not add item.');
    }
  }

  async function saveEdit() {
    if (editingId === null) return;
    if (!editFields.name.trim() || !editFields.price.trim() || !editFields.category.trim()) {
      return Alert.alert('Validation', 'Please fill all fields.');
    }
    const p = parseFloat(editFields.price);
    if (isNaN(p)) {
      return Alert.alert('Validation', 'Price must be a number.');
    }
    try {
      await databaseService.updateMenuItem(
        editingId,
        {
          name: editFields.name.trim(),
          price: p,
          category: editFields.category.trim(),
        }
      );
      setEditingId(null);
      fetchProducts();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not update item.');
    }
  }

  function deleteItem(id: number) {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteMenuItem(id);
              fetchProducts();
            } catch (err) {
              console.error(err);
              Alert.alert('Error', 'Could not delete item.');
            }
          },
        },
      ]
    );
  }

  function openCategoryModal() {
    setNewCategory('');
    setCategoryModalVisible(true);
  }

  function handleAddCategory() {
    if (!newCategory.trim()) return;
    if (editingId !== null) {
      setEditFields(f => ({ ...f, category: newCategory.trim() }));
    } else {
      setCategory(newCategory.trim());
    }
    setCategoryModalVisible(false);
  }

  const filtered = products.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const categories = Array.from(new Set(products.map(p => p.category)));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.replace('/central_settings')}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={28} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Menu Editor</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={22} color="#6c757d" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search menu items..."
            placeholderTextColor="#6c757d"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              searchQuery === '' && styles.categoryChipActive,
            ]}
            onPress={() => setSearchQuery('')}
          >
            <Text
              style={[
                styles.categoryText,
                searchQuery === '' && styles.categoryTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                searchQuery === cat && styles.categoryChipActive,
              ]}
              onPress={() => setSearchQuery(cat)}
            >
              <Text
                style={[
                  styles.categoryText,
                  searchQuery === cat && styles.categoryTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Add New Button */}
        {!isAdding && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsAdding(true)}
          >
            <Ionicons name="add" size={26} color="white" />
            <Text style={styles.addButtonText}>Add New Item</Text>
          </TouchableOpacity>
        )}

        {/* Add Form */}
        {isAdding && (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Add New Menu Item</Text>
            <Text style={styles.inputLabel}>Item Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
            <Text style={styles.inputLabel}>Price</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryInputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={category}
                onChangeText={setCategory}
              />
              <TouchableOpacity
                style={styles.addCategoryButton}
                onPress={openCategoryModal}
              >
                <Ionicons name="add" size={22} color="white" />
              </TouchableOpacity>
            </View>
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsAdding(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAdd}
              >
                <Text style={styles.saveButtonText}>Save Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* List */}
        <Text style={styles.sectionTitle}>
          {searchQuery ? `Search Results (${filtered.length})` : 'All Menu Items'}
        </Text>
        <FlatList
          data={filtered}
          keyExtractor={item => item.id.toString()}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              {editingId === item.id ? (
                <View style={styles.editForm}>
                  <Text style={styles.inputLabel}>Item Name</Text>
                  <TextInput
                    style={styles.input}
                    value={editFields.name}
                    onChangeText={text => setEditFields(f => ({ ...f, name: text }))}
                  />
                  <Text style={styles.inputLabel}>Price</Text>
                  <TextInput
                    style={styles.input}
                    value={editFields.price}
                    onChangeText={text => setEditFields(f => ({ ...f, price: text }))}
                    keyboardType="numeric"
                  />
                  <Text style={styles.inputLabel}>Category</Text>
                  <View style={styles.categoryInputRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={editFields.category}
                      onChangeText={text => setEditFields(f => ({ ...f, category: text }))}
                    />
                    <TouchableOpacity style={styles.addCategoryButton} onPress={openCategoryModal}>
                      <Ionicons name="add" size={22} color="white" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.formButtons}>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setEditingId(null)}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={saveEdit}>
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemCategory}>{item.category}</Text>
                    <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => {
                        setEditingId(item.id);
                        setEditFields({
                          name: item.name,
                          price: String(item.price),
                          category: item.category,
                        });
                      }}
                    >
                      <Feather name="edit-2" size={20} color={PRIMARY_COLOR} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteItem(item.id)}
                    >
                      <Feather name="trash-2" size={20} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Feather name="package" size={52} color="#adb5bd" />
              <Text style={styles.emptyStateText}>No items found</Text>
            </View>
          )}
        />

        {/* Category Modal */}
        <Modal visible={categoryModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Category</Text>
              <Text style={styles.inputLabel}>Category Name</Text>
              <TextInput
                style={styles.input}
                value={newCategory}
                onChangeText={setNewCategory}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setCategoryModalVisible(false)}>
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmButton} onPress={handleAddCategory}>
                  <Text style={styles.modalConfirmButtonText}>Add Category</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: { padding: 8 },
  placeholder: { width: 28 },
  headerTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: DARK_GRAY,
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    elevation: 2,
    height: 56,
  },
  searchIcon: { marginRight: 12, color: '#6c757d' },
  searchInput: { flex: 1, height: '100%', color: DARK_GRAY, fontSize: 18 },
  categoryContainer: { paddingBottom: 12, marginBottom: 24, maxHeight: 60 },
  categoryChip: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    elevation: 1,
  },
  categoryChipActive: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  categoryText: { color: '#495057', fontSize: 16, fontWeight: '500' },
  categoryTextActive: { color: 'white' },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: DARK_GRAY,
    marginBottom: 20,
    marginTop: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 12,
    padding: 18,
    marginBottom: 28,
    elevation: 3,
  },
  addButtonText: { color: 'white', fontSize: 20, fontWeight: '500', marginLeft: 12 },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    marginBottom: 28,
    elevation: 3,
  },
  inputLabel: { fontSize: 18, color: DARK_GRAY, marginBottom: 10, fontWeight: '500' },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    fontSize: 18,
  },
  categoryInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  addCategoryButton: { backgroundColor: PRIMARY_COLOR, borderRadius: 10, padding: 12, marginLeft: 12 },
  formButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  cancelButton: {
    backgroundColor: '#e9ecef',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginRight: 16,
  },
  cancelButtonText: { color: '#495057', fontWeight: '500', fontSize: 18 },
  saveButton: { backgroundColor: PRIMARY_COLOR, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 28 },
  saveButtonText: { color: 'white', fontWeight: '500', fontSize: 18 },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
  },
  itemInfo: { flex: 1, marginRight: 20 },
  itemName: { fontSize: 20, fontWeight: '500', color: DARK_GRAY, marginBottom: 8 },
  itemCategory: { fontSize: 16, color: '#6c757d', marginBottom: 8 },
  itemPrice: { fontSize: 20, fontWeight: '600', color: PRIMARY_COLOR },
  itemActions: { flexDirection: 'row', alignItems: 'center' },
  editButton: { padding: 12, backgroundColor: '#e9ecef', borderRadius: 10, marginRight: 12 },
  deleteButton: { padding: 12, backgroundColor: '#fff5f5', borderRadius: 10 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 24,
    elevation: 2,
  },
  emptyStateText: { fontSize: 20, color: '#adb5bd', marginTop: 20, fontWeight: '500' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 28, width: '60%', maxWidth: 500, minWidth: 350 },
  modalTitle: { fontSize: 22, fontWeight: '600', color: DARK_GRAY, marginBottom: 24, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24 },
  modalCancelButton: { paddingVertical: 14, paddingHorizontal: 28, marginRight: 16, borderRadius: 10, backgroundColor: '#e9ecef' },
  modalCancelButtonText: { color: DARK_GRAY, fontWeight: '500', fontSize: 18 },
  modalConfirmButton: { backgroundColor: PRIMARY_COLOR, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 28 },
  modalConfirmButtonText: { color: 'white', fontWeight: '500', fontSize: 18 },
  editForm: { flex: 1, width: '100%' },
});
