// src/hooks/useMedications.js
// Reusable hook for loading and refreshing the medication list.

import { useState, useCallback } from 'react';
import { getMedications } from '../services/medicationService';

export const useMedications = (userId) => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const meds = await getMedications(userId);
      setMedications(meds);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return { medications, loading, error, reload: load };
};
