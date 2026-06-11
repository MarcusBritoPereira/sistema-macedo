import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Observable } from 'rxjs';

export interface Subcategory {
  id: string;
  nome: string;
  description?: string; // Using 'description' to match what might be returned or I should check if backend returns 'descricao'.
  // Wait, backend returns 'descricao'. I should match backend or use a map. Prisma returns 'descricao'.
  descricao?: string;
  categoriaId: string;
}

export interface Category {
  id?: string;
  nome: string;
  tipo: 'RECEITA' | 'DESPESA';
  descricao?: string;
  classificacao?: string; // DRE Classification
  parentId?: string | null;
  children?: Subcategory[];
  parent?: Category | null;
  subcategorias?: Subcategory[];
}

@Injectable({
  providedIn: 'root',
})
export class CategoriesService {
  constructor(private api: ApiService) {}

  findAll(): Observable<Category[]> {
    return this.api.get<Category[]>('financial/categories');
  }

  findOne(id: string): Observable<Category> {
    return this.api.get<Category>(`financial/categories/${id}`);
  }

  create(category: Category): Observable<Category> {
    return this.api.post<Category>('financial/categories', category);
  }

  update(id: string, category: Category): Observable<Category> {
    return this.api.patch<Category>(`financial/categories/${id}`, category);
  }

  delete(id: string): Observable<any> {
    return this.api.delete(`financial/categories/${id}`);
  }

  updateSubcategory(
    id: string,
    nome: string,
    descricao?: string,
  ): Observable<any> {
    return this.api.patch(`financial/categories/${id}`, { nome, descricao });
  }

  createSubcategory(
    categoriaId: string,
    nome: string,
    descricao?: string,
    tipo: 'RECEITA' | 'DESPESA' = 'DESPESA',
  ): Observable<any> {
    return this.api.post(`financial/categories`, {
      parentId: categoriaId,
      nome,
      descricao,
      tipo,
    });
  }

  deleteSubcategory(id: string): Observable<any> {
    return this.api.delete(`financial/categories/${id}`);
  }
}
