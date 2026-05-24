import client from './client';

/**
 * REST API endpoints wrapper
 */
export const login = async (username, password) => {
  const response = await client.post('/api/auth/login/', { username, password });
  return response.data;
};

export const getDashboardSummary = async () => {
  const response = await client.get('/api/dashboard/summary/');
  return response.data;
};

export const getRecords = async (params = {}) => {
  // Convert pagination/filters to query parameters
  const response = await client.get('/api/records/', { params });
  return response.data;
};

export const updateRecordStatus = async (id, status, flagReason = null) => {
  const payload = { status };
  if (flagReason) {
    payload.flag_reason = flagReason;
  }
  const response = await client.patch(`/api/records/${id}/`, payload);
  return response.data;
};

export const uploadCSV = async (type, file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  // type can be 'sap', 'utility', or 'travel'
  const response = await client.post(`/api/ingest/${type.toLowerCase()}/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
