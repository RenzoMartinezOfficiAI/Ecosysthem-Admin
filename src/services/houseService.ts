import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { House } from '../../types';

const housesCol = collection(db, 'houses');

function houseConverter(data: any, id: string): House {
  return {
    id,
    name: data.name,
    address: data.address,
    capacity: data.capacity,
    status: data.status,
    tags: data.tags ?? [],
    notes: data.notes,
    city: data.city,
    state: data.state,
    postalCode: data.postalCode,
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  };
}

export async function fetchHouses(): Promise<House[]> {
  const q = query(housesCol, orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map(d => houseConverter(d.data(), d.id));
}

export async function fetchHouseById(id: string): Promise<House | null> {
  const ref = doc(db, 'houses', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return houseConverter(snap.data(), snap.id);
}

export interface CreateHouseInput {
  name: string;
  address: string;
  capacity: number;
  status?: 'ONLINE' | 'MAINTENANCE' | 'OFFLINE';
  tags?: string[];
  notes?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export async function createHouse(input: CreateHouseInput): Promise<string> {
  const now = new Date().toISOString();
  
  // Helper to remove undefined keys to prevent Firestore errors
  const cleanData = (obj: any) => {
    Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key]);
    return obj;
  };

  const data = cleanData({
    name: input.name.trim(),
    address: input.address.trim(),
    capacity: input.capacity,
    status: input.status ?? 'ONLINE',
    tags: input.tags ?? [],
    notes: input.notes ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    postalCode: input.postalCode ?? null,
    createdAt: now,
    updatedAt: now,
    createdAtServer: serverTimestamp(),
    updatedAtServer: serverTimestamp(),
  });

  const docRef = await addDoc(housesCol, data);
  return docRef.id;
}

export interface UpdateHouseInput {
  name?: string;
  address?: string;
  capacity?: number;
  status?: 'ONLINE' | 'MAINTENANCE' | 'OFFLINE';
  tags?: string[];
  notes?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

export async function updateHouse(id: string, input: UpdateHouseInput): Promise<void> {
  const ref = doc(db, 'houses', id);
  
  const update: Record<string, any> = { 
    updatedAt: new Date().toISOString(), 
    updatedAtServer: serverTimestamp() 
  };

  if (input.name !== undefined) update.name = input.name.trim();
  if (input.address !== undefined) update.address = input.address.trim();
  if (input.capacity !== undefined) update.capacity = input.capacity;
  if (input.status !== undefined) update.status = input.status;
  if (input.tags !== undefined) update.tags = input.tags;
  if (input.notes !== undefined) update.notes = input.notes;
  if (input.city !== undefined) update.city = input.city;
  if (input.state !== undefined) update.state = input.state;
  if (input.postalCode !== undefined) update.postalCode = input.postalCode;

  await updateDoc(ref, update);
}