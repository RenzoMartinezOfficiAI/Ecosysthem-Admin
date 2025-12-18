import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  where,
  increment,
  DocumentData,
  QueryDocumentSnapshot,
  SnapshotOptions
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { InventoryItem } from '../../types';

const inventoryCol = collection(db, 'inventory');

function inventoryConverter(data: DocumentData, id: string): InventoryItem {
  return {
    id,
    houseId: data.houseId,
    name: data.name,
    category: data.category ?? 'General',
    quantity: data.quantity ?? 0,
    reorderThreshold: data.reorderThreshold ?? 0,
    unit: data.unit ?? 'pcs',
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  };
}

const inventoryConverterObj = {
  toFirestore(item: Partial<InventoryItem>): DocumentData {
     const { id, ...data } = item;
     return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): InventoryItem {
      const data = snapshot.data(options);
      return inventoryConverter(data, snapshot.id);
  }
};

export async function fetchInventory(houseId: string): Promise<InventoryItem[]> {
  const q = query(inventoryCol.withConverter(inventoryConverterObj), where('houseId', '==', houseId), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export function subscribeToInventory(
  houseId: string,
  onUpdate: (items: InventoryItem[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(inventoryCol.withConverter(inventoryConverterObj), where('houseId', '==', houseId), orderBy('name'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => d.data());
    onUpdate(items);
  }, (error) => {
    console.error("Error subscribing to inventory:", error);
    if (onError) onError(error);
  });
}

export interface CreateInventoryItemInput {
  houseId: string;
  name: string;
  category?: string;
  quantity: number;
  reorderThreshold: number;
  unit: string;
}

export async function createInventoryItem(input: CreateInventoryItemInput): Promise<string> {
  const now = new Date().toISOString();
  
  const data = {
    houseId: input.houseId,
    name: input.name.trim(),
    category: input.category ?? 'General',
    quantity: input.quantity,
    reorderThreshold: input.reorderThreshold,
    unit: input.unit,
    createdAt: now,
    updatedAt: now,
    createdAtServer: serverTimestamp(),
    updatedAtServer: serverTimestamp(),
  };

  const docRef = await addDoc(inventoryCol, data);
  return docRef.id;
}

export async function updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<void> {
  const ref = doc(db, 'inventory', id);
  const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp()
  };

  if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
  if (updates.reorderThreshold !== undefined) updateData.reorderThreshold = updates.reorderThreshold;
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.unit !== undefined) updateData.unit = updates.unit;

  await updateDoc(ref, updateData);
}

export async function updateInventoryQuantity(id: string, delta: number): Promise<void> {
  const ref = doc(db, 'inventory', id);
  await updateDoc(ref, {
      quantity: increment(delta),
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp()
  });
}

export async function deleteInventoryItem(id: string): Promise<void> {
    const ref = doc(db, 'inventory', id);
    await deleteDoc(ref);
}
