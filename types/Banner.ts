export interface Banner {
    id: string;
    image: string;
    link?: string;
    title?: string;
    active: boolean;
    order: number;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}
