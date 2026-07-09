import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

/**
 * Fetch all invoices, optionally filtered by user UID.
 */
export function useInvoices(createdBy = null) {
  return useQuery({
    queryKey: ['invoices', { createdBy }],
    queryFn: async () => {
      if (!navigator.onLine) throw new Error('You are offline. Please check your internet connection.');
      const params = {};
      if (createdBy) params.createdBy = createdBy;
      const response = await apiClient.get('/v1/invoices', { params });
      return response.data;
    },
    staleTime: 1000 * 15,
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
      if (!navigator.onLine) throw new Error('You are offline.');
      const response = await apiClient.get(`/v1/invoices/${invoiceId}`);
      return response.data;
    },
    enabled: !!invoiceId,
    retry: 1,
  });
}

/**
 * Stage-1: Extract invoice fields from a PDF (no DB write).
 * Returns ExtractionResult with per-field confidence scores.
 * Call this immediately on file selection; the full upload follows.
 *
 * OCR-ready: swap the backend extractor without changing this hook.
 */
export function useExtractInvoice() {
  return useMutation({
    mutationFn: async ({ file }) => {
      if (!navigator.onLine) throw new Error('You are offline.');
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/v1/invoices/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      return response.data;
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.message || 'Extraction failed.';
      if (!msg.toLowerCase().includes('scanned')) {
        toast.error(`Extraction: ${msg}`);
      }
    },
  });
}

/**
 * Stage-2: Upload invoice PDF + confirmed metadata to the backend.
 * Shows real upload progress via onUploadProgress callback.
 */
export function useUploadInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, metadata, onProgress }) => {
      if (!navigator.onLine) throw new Error('You are offline.');
      const formData = new FormData();
      formData.append('file', file);
      Object.keys(metadata).forEach(k => formData.append(k, metadata[k]));

      const response = await apiClient.post('/v1/invoices/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (ev) => {
          if (ev.total && onProgress) {
            onProgress(Math.round((ev.loaded * 100) / ev.total));
          }
        },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Invoice uploaded and processed successfully!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.message || 'Upload failed.';
      toast.error(`Upload failed: ${msg}`);
    },
  });
}
