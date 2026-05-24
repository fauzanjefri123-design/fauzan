export type BusinessType = 
  | 'Caffe' 
  | 'Restoran' 
  | 'Laundry' 
  | 'Mini market' 
  | 'Toko pakaian' 
  | 'Salon' 
  | 'Bengkel' 
  | 'Toko online' 
  | 'Usaha sendiri' 
  | 'Lainnya';

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  role: 'Owner' | 'Karyawan';
}

export interface BusinessData {
  name: string;
  type: BusinessType;
  ownerName: string;
  email: string;
  phone: string;
}
