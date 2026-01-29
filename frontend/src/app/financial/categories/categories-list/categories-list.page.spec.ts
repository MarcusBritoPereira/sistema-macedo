import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoriesListPage } from './categories-list.page';

describe('CategoriesListPage', () => {
  let component: CategoriesListPage;
  let fixture: ComponentFixture<CategoriesListPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CategoriesListPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
