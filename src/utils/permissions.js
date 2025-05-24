// Permission utility for frontend
class PermissionManager {
  constructor() {
    this.permissions = null;
    this.user = null;
  }

  // Initialize permissions from user data
  initialize(userData) {
    this.user = userData;
    this.permissions = userData.permissions || {};
  }

  // Check if user has access to a module
  hasModuleAccess(module) {
    return this.permissions?.[module]?.allowed === true;
  }

  // Check if user can perform an action on a module
  canPerformAction(module, action) {
    return this.permissions?.[module]?.actions?.includes(action) === true;
  }

  // Get all modules user has access to
  getAccessibleModules() {
    return Object.entries(this.permissions)
      .filter(([_, data]) => data.allowed)
      .map(([module]) => module);
  }

  // Get all actions user can perform on a module
  getModuleActions(module) {
    return this.permissions?.[module]?.actions || [];
  }

  // Check if user is super admin
  isSuperAdmin() {
    return this.user?.role === 'super_admin';
  }

  // Check if user is manager
  isManager() {
    return this.user?.role === 'manager';
  }

  // Clear permissions (for logout)
  clear() {
    this.permissions = null;
    this.user = null;
  }
}

// Create a singleton instance
const permissionManager = new PermissionManager();

export default permissionManager; 