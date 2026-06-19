import { useQuery } from '@tanstack/react-query';
import { getOvationGrid } from '../api/forecast';

type BBox = [number, number, number, number];

function roundBBox(bbox: BBox): BBox {
  return bbox.map((value) => Number(value.toFixed(4))) as BBox;
}

export function useOvationGrid(bbox?: BBox) {
  return useQuery({
    queryKey: ['ovation-grid', bbox ? roundBBox(bbox) : null],
    queryFn: () => getOvationGrid(bbox),
    staleTime: 20 * 60_000,
  });
}
