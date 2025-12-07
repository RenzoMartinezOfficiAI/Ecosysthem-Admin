import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  increment,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { InventoryItem } from '../../types';

const inventoryCol = collection(db, 'inventoryItems');

function inventoryConverter(data: any, id: string): InventoryItem {
  return {
    id,
    houseId: data.houseId,
    name: data.name,
    category: data.category,
    quantity: data.quantity ?? 0,
    reorderThreshold: data.reorderThreshold ?? 0,
    unit: data.unit ?? 'units',
    updatedAt: data.updatedAt ?? new Date().toISOString()
  };
}

export function subscribeToInventory(houseId: string, onUpdate: (items: InventoryItem[]) => void): () => void {
  const q = query(inventoryCol, where('houseId', '==', houseId), orderBy('name'));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(d => inventoryConverter(d.data(), d.id));
    onUpdate(items);
  }, (error) => {
    console.error("Inventory subscription error:", error);
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
  const docRef = await addDoc(inventoryCol, {
    houseId: input.houseId,
    name: input.name.trim(),
    category: input.category || 'General',
    quantity: input.quantity,
    reorderThreshold: input.reorderThreshold,
    unit: input.unit,
    createdAt: now,
    updatedAt: now,
    createdAtServer: serverTimestamp(),
    updatedAtServer: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateInventoryQuantity(itemId: string, delta: number): Promise<void> {
  const ref = doc(db, 'inventoryItems', itemId);
  await updateDoc(ref, {
    quantity: increment(delta),
    updatedAt: new Date().toISOString(),
    updatedAtServer: serverTimestamp()
  });
}

export async function deleteInventoryItem(itemId: string): Promise<void> {
  const ref = doc(db, 'inventoryItems', itemId);
  await deleteDoc(ref);
}
