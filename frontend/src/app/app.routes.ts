
import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth/auth.guard';
import { RestrictedFinancialGuard } from './guards/restricted-financial/restricted-financial.guard';

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
    canActivate: [AuthGuard, RestrictedFinancialGuard]
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
    canActivate: [AuthGuard, RestrictedFinancialGuard]
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
    canActivate: [AuthGuard, RestrictedFinancialGuard]
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


  {
    path: 'stock/dashboard',
    loadComponent: () => import('./stock/dashboard/stock-dashboard.page').then(m => m.StockDashboardPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'stock/materials',
    loadComponent: () => import('./stock/materials/stock-materials.page').then(m => m.StockMaterialsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'stock/categories',
    loadComponent: () => import('./stock/categories/stock-categories.page').then(m => m.StockCategoriesPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'stock/locations',
    loadComponent: () => import('./stock/locations/stock-locations.page').then(m => m.StockLocationsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'stock/balances',
    loadComponent: () => import('./stock/balances/stock-balances.page').then(m => m.StockBalancesPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'stock/entries',
    loadComponent: () => import('./stock/documents/stock-documents.page').then(m => m.StockDocumentsPage),
    canActivate: [AuthGuard],
    data: { kind: 'entries' }
  },
  {
    path: 'stock/issues',
    loadComponent: () => import('./stock/documents/stock-documents.page').then(m => m.StockDocumentsPage),
    canActivate: [AuthGuard],
    data: { kind: 'issues' }
  },
  {
    path: 'stock/transfers',
    loadComponent: () => import('./stock/documents/stock-documents.page').then(m => m.StockDocumentsPage),
    canActivate: [AuthGuard],
    data: { kind: 'transfers' }
  },
  {
    path: 'stock/entries/:id',
    loadComponent: () => import('./stock/document-detail/stock-document-detail.page').then(m => m.StockDocumentDetailPage),
    canActivate: [AuthGuard],
    data: { kind: 'entries' }
  },
  {
    path: 'stock/issues/:id',
    loadComponent: () => import('./stock/document-detail/stock-document-detail.page').then(m => m.StockDocumentDetailPage),
    canActivate: [AuthGuard],
    data: { kind: 'issues' }
  },
  {
    path: 'stock/transfers/:id',
    loadComponent: () => import('./stock/document-detail/stock-document-detail.page').then(m => m.StockDocumentDetailPage),
    canActivate: [AuthGuard],
    data: { kind: 'transfers' }
  },
  {
    path: 'stock/requests',
    loadComponent: () => import('./stock/requests/stock-requests.page').then(m => m.StockRequestsPage),
    canActivate: [AuthGuard],
    data: { mode: 'requests' }
  },
  {
    path: 'stock/requests/:id',
    loadComponent: () => import('./stock/request-detail/stock-request-detail.page').then(m => m.StockRequestDetailPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'stock/reservations',
    loadComponent: () => import('./stock/requests/stock-requests.page').then(m => m.StockRequestsPage),
    canActivate: [AuthGuard],
    data: { mode: 'reservations' }
  },
  {
    path: 'stock/inventories',
    loadComponent: () => import('./stock/inventories/stock-inventories.page').then(m => m.StockInventoriesPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'stock/inventories/:id',
    loadComponent: () => import('./stock/inventory-detail/stock-inventory-detail.page').then(m => m.StockInventoryDetailPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'stock/budgets',
    loadComponent: () => import('./stock/budgets/stock-budgets.page').then(m => m.StockBudgetsPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'stock/budgets/:id',
    loadComponent: () => import('./stock/budget-detail/stock-budget-detail.page').then(m => m.StockBudgetDetailPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'stock/reports',
    loadComponent: () => import('./stock/reports/stock-reports.page').then(m => m.StockReportsPage),
    canActivate: [AuthGuard]
  },

];
