import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Create AXIOS instance with configured timeouts
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s timeout for large uploads
});

/**
 * Fetch all invoices, optionally filtered by user UID.
 */
export function useInvoices(createdBy = null) {
  return useQuery({
    queryKey: ['invoices', { createdBy }],
    queryFn: async () => {
      if (!navigator.onLine) {
        throw new Error("You are offline. Please check your internet connection.");
      }
      const params = {};
      if (createdBy) params.createdBy = createdBy;
      
      const response = await apiClient.get('/v1/invoices', { params });
      return response.data;
    },
    staleTime: 1000 * 15, // 15 seconds cache freshness
    retry: 2,
  });
}

/**
 * Fetch a single invoice by document ID.
 */
export function useInvoice(invoiceId) {
  return useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      if (!navigator.onLine) {
        throw new Error("You are offline. Please check your internet connection.");
      }
      const response = await apiClient.get(`/v1/invoices/${invoiceId}`);
      return response.data;
    },
    enabled: !!invoiceId,
    retry: 1,
  });
}

/**
 * Mutation hook to upload invoice with progress tracking.
 */
export function useUploadInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, metadata, onProgress }) => {
      if (!navigator.onLine) {
        throw new Error("You are offline. Please check your internet connection.");
      }

      const formData = new FormData();
      formData.append('file', file);
      
      // Append all invoice metadata fields
      Object.keys(metadata).forEach(key => {
        formData.append(key, metadata[key]);
      });

      const response = await apiClient.post('/v1/invoices/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentage);
          }
        },
      });

      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Invoice uploaded and processed successfully!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      const errMsg = error.response?.data?.detail || error.message || 'Failed to upload invoice.';
      toast.error(`Upload failed: ${errMsg}`);
    },
  });
}
