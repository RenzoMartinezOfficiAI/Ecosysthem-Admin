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
  onSnapshot,
  QueryDocumentSnapshot,
  SnapshotOptions,
  DocumentData
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { House } from '../../types';

const housesCol = collection(db, 'houses');

// Define Firestore data shape
interface HouseFirestoreData {
  name: string;
  address: string;
  capacity: number;
  status: 'ONLINE' | 'MAINTENANCE' | 'OFFLINE';
  tags?: string[];
  notes?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

const houseConverter = {
  toFirestore(house: Partial<House>): DocumentData {
    const { id, ...data } = house;
    return data;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): House {
    const data = snapshot.data(options) as HouseFirestoreData;
    return {
      id: snapshot.id,
      name: data.name,
      address: data.address,
      capacity: data.capacity,
      status: data.status,
      tags: data.tags ?? [],
      notes: data.notes ?? undefined,
      city: data.city ?? undefined,
      state: data.state ?? undefined,
      postalCode: data.postalCode ?? undefined,
      createdAt: data.createdAt ?? new Date().toISOString(),
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    };
  }
};

export async function fetchHouses(): Promise<House[]> {
  const q = query(housesCol.withConverter(houseConverter), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export function subscribeToHouses(
  onUpdate: (houses: House[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(housesCol.withConverter(houseConverter), orderBy('name'));
  return onSnapshot(q, (snapshot) => {
    const houses = snapshot.docs.map((d) => d.data());
    onUpdate(houses);
  }, (error) => {
    console.error("Error subscribing to houses:", error);
    if (onError) onError(error);
  });
}

export async function fetchHouseById(id: string): Promise<House | null> {
  const ref = doc(db, 'houses', id).withConverter(houseConverter);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
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
  
  // Explicitly typed object creation to avoid 'any'
  const data: Record<string, unknown> = {
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
  };

  // Remove undefined/null values if necessary, though Firestore handles null. 
  // We remove undefined to be safe.
  Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

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
  
  // Strictly typed update object
  const update: Record<string, string | number | string[] | null | object> = { 
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
