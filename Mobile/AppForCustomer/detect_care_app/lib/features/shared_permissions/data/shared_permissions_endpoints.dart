class SharedPermissionsEndpoints {
  const SharedPermissionsEndpoints();

  String pair(String customerId, String caregiverId) =>
      '/customers/$customerId/shared-permissions/$caregiverId';

  // Invitation endpoints
  String sendInvitation(String customerId) =>
      '/customers/$customerId/invitations';

  String getInvitations(String customerId) =>
      '/customers/$customerId/invitations';

  String respondInvitation(String customerId, String invitationId) =>
      '/customers/$customerId/invitations/$invitationId/respond';

  String revokeInvitation(String customerId, String invitationId) =>
      '/customers/$customerId/invitations/$invitationId/revoke';

  String getPendingInvitations(String caregiverId) =>
      '/caregivers/$caregiverId/invitations/pending';
}

SharedPermissionsEndpoints makeSharedPermissionsEndpoints() =>
    const SharedPermissionsEndpoints();
