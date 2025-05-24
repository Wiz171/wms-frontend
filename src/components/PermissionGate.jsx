import React from 'react';
import permissionManager from '../utils/permissions';

const PermissionGate = ({ 
  module, 
  action, 
  children, 
  fallback = null,
  requireSuperAdmin = false,
  requireManager = false
}) => {
  // Check if user meets role requirements
  if (requireSuperAdmin && !permissionManager.isSuperAdmin()) {
    return fallback;
  }

  if (requireManager && !permissionManager.isManager()) {
    return fallback;
  }

  // If no module/action specified, just check role requirements
  if (!module && !action) {
    return children;
  }

  // Check module access
  if (module && !permissionManager.hasModuleAccess(module)) {
    return fallback;
  }

  // Check action permission
  if (action && !permissionManager.canPerformAction(module, action)) {
    return fallback;
  }

  return children;
};

export default PermissionGate; 