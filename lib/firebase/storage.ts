import { getStorage, ref, uploadBytes, getDownloadURL, type FirebaseStorage } from "firebase/storage";
import { firebaseApp } from "@/lib/firebase";

let storageInstance: FirebaseStorage | null = null;

function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(firebaseApp);
  }
  return storageInstance;
}

export async function uploadInventoryImage(file: File, carId: string): Promise<string> {
  const storage = getFirebaseStorage();
  const path = `inventory/${carId}/${Date.now()}-${file.name}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}
