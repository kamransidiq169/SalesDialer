import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export const useContacts = (params = {}) => {
  const { page = 1, limit = 10, search = '', status = '' } = params;

  return useQuery({
    queryKey: ['contacts', page, limit, search, status],
    queryFn: async () => {
      const response = await api.get('/contacts', {
        params: { page, limit, search, status },
      });
      return response.data.data;
    },
    keepPreviousData: true,
  });
};

export const useContact = (id) => {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      const response = await api.get(`/contacts/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
};
