
import { ObjectId } from 'mongodb';

export interface Attribute {
  _id?: ObjectId;
  name: string; // e.g., "Color", "Size", "Material"
  type: 'select' | 'text' | 'number';
  options?: string[]; // e.g., ["Red", "Blue"] for select type
  createdAt: Date;
  updatedAt: Date;
}
