
import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'financial/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'home',
    redirectTo: 'financial/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'clients',
    loadComponent: () => import('./clients/clients-list/clients-list.page').then(m => m.ClientsListPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'clients/:id',
    loadComponent: () => import('./clients/client-detail/client-detail.page').then(m => m.ClientDetailPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'suppliers',
    loadComponent: () => import('./suppliers/suppliers-list/suppliers-list.page').then(m => m.SuppliersListPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'suppliers/:id',
    loadComponent: () => import('./suppliers/supplier-detail/supplier-detail.page').then(m => m.SupplierDetailPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'users',
    loadComponent: () => import('./users/users-list/users-list.page').then(m => m.UsersListPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'users/:id',
    loadComponent: () => import('./users/user-detail/user-detail.page').then(m => m.UserDetailPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'financial',
    loadComponent: () => import('./financial/financial-list/financial-list.page').then(m => m.FinancialListPage),
    canActivate: [AuthGuard],
    pathMatch: 'full'
  },
  {
    path: 'financial/receivables',
    loadComponent: () => import('./financial/receivables/receivables-list/receivables-list.page').then(m => m.ReceivablesListPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'financial/receivables/:id',
    loadComponent: () => import('./financial/financial-detail/financial-detail.page').then(m => m.FinancialDetailPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'financial/payables',
    loadComponent: () => import('./financial/payables/payables-list/payables-list.page').then(m => m.PayablesListPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'financial/payables/:id',
    loadComponent: () => import('./financial/financial-detail/financial-detail.page').then(m => m.FinancialDetailPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'contracts',
    loadComponent: () => import('./contracts/contracts-list/contracts-list.page').then(m => m.ContractsListPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'contracts/:id',
    loadComponent: () => import('./contracts/contract-detail/contract-detail.page').then(m => m.ContractDetailPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'financial/dashboard',
    loadComponent: () => import('./financial/dashboard/dashboard.page').then(m => m.DashboardPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'financial/budget',
    loadComponent: () => import('./financial/budget/budget.page').then(m => m.BudgetPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'financial/categories',
    loadComponent: () => import('./financial/categories/categories-list/categories-list.page').then(m => m.CategoriesListPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'financial/banking-configuration',
    loadComponent: () => import('./financial/banking-configuration/banking-configuration.page').then(m => m.BankingConfigurationPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'financial/categories/:id',
    loadComponent: () => import('./financial/categories/category-detail/category-detail.page').then(m => m.CategoryDetailPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'financial/cost-centers',
    loadComponent: () => import('./financial/cost-centers/cost-centers-list/cost-centers-list.page').then(m => m.CostCentersListPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'financial/cost-centers/:id',
    loadComponent: () => import('./financial/cost-centers/cost-center-detail/cost-center-detail.page').then(m => m.CostCenterDetailPage),
    canActivate: [AuthGuard]
  },

  {
    path: 'financial/cash-flow',
    loadComponent: () => import('./financial/cash-flow/cash-flow.page').then(m => m.CashFlowPage),
    canActivate: [AuthGuard]
  },

  {
    path: 'financial/accrual',
    loadComponent: () => import('./financial/financial-list/financial-list.page').then(m => m.FinancialListPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'financial/statements',
    loadComponent: () => import('./financial/statements/statements.page').then(m => m.StatementsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'financial/dre',
    loadComponent: () => import('./financial/dre/dre.page').then(m => m.DrePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'financial/bank-accounts',
    loadComponent: () => import('./financial/bank-accounts/bank-accounts.page').then(m => m.BankAccountsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'financial/reconciliation',
    loadComponent: () => import('./financial/reconciliation/reconciliation.page').then(m => m.ReconciliationPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'financial/history',
    loadComponent: () => import('./financial/audit-log/audit-log.page').then(m => m.AuditLogPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'financial/reports',
    loadComponent: () => import('./financial/reports/reports.page').then(m => m.ReportsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'financial/obras/obras-list',
    loadComponent: () => import('./financial/obras/obras-list/obras-list.page').then( m => m.ObrasListPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'financial/obras/obra-detail/:id',
    loadComponent: () => import('./financial/obras/obra-detail/obra-detail.page').then( m => m.ObraDetailPage),
    canActivate: [AuthGuard]
  },


];
