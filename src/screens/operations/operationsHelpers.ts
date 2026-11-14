import { toEnglishDigits } from '@shared/utils/plateUtils';
import { InventoryItem, VehicleItem } from '../../services/operations';
import { DelegateWithStatus } from '../../services/supervisor';

export type OperationsTab = 'oil' | 'fleet' | 'accidents';

export interface EnrichedVehicleItem extends VehicleItem {
  courierName?: string;
}

export const buildSearchableBikes = (
  vehicles: VehicleItem[],
  employees: DelegateWithStatus[]
): EnrichedVehicleItem[] => {
  const map = new Map<string, EnrichedVehicleItem>();

  vehicles.forEach((v) => {
    if (!v.plate_number || !v.plate_number.trim()) return;
    const normKey = toEnglishDigits(v.plate_number).replace(/\s+/g, '').toLowerCase();
    map.set(normKey, { ...v });
  });

  employees.forEach((emp) => {
    const plate = (emp.active_motorcycle || emp.motorcycle_number || '').trim();
    if (!plate) return;
    const normKey = toEnglishDigits(plate).replace(/\s+/g, '').toLowerCase();
    const existing = map.get(normKey);
    if (existing) {
      if (!existing.key_number && emp.key_number) existing.key_number = emp.key_number;
      if (!existing.courierName && emp.name) existing.courierName = emp.name;
      if (!existing.current_km && emp.start_km) existing.current_km = emp.start_km;
    } else {
      map.set(normKey, {
        id: `emp-bike-${emp.id}`,
        plate_number: plate,
        key_number: emp.key_number || '',
        model: 'دباب توصيل',
        status: 'ACTIVE',
        current_km: emp.start_km || 0,
        courierName: emp.name || '',
      });
    }
  });

  return Array.from(map.values());
};

export const filterBikesByQuery = (
  allSearchableBikes: EnrichedVehicleItem[],
  rawQuery: string
): EnrichedVehicleItem[] => {
  const normalizedQuery = toEnglishDigits(rawQuery.trim()).toLowerCase();
  const queryDigitsOnly = normalizedQuery.replace(/\D/g, '');
  if (queryDigitsOnly.length < 2 && normalizedQuery.length < 2) {
    return [];
  }

  return allSearchableBikes.filter((v) => {
    const plateNorm = toEnglishDigits(v.plate_number || '').toLowerCase();
    const plateDigits = plateNorm.replace(/\D/g, '');
    const keyNorm = toEnglishDigits(v.key_number || '').toLowerCase();
    const courierNorm = (v.courierName || '').toLowerCase();

    if (queryDigitsOnly.length >= 2 && plateDigits.includes(queryDigitsOnly)) {
      return true;
    }
    if (keyNorm && keyNorm === queryDigitsOnly) {
      return true;
    }
    return plateNorm.includes(normalizedQuery) || courierNorm.includes(normalizedQuery);
  });
};

export const filterFleetVehicles = (
  allSearchableBikes: EnrichedVehicleItem[],
  fleetStatusFilter: 'ALL' | 'ACTIVE' | 'MAINTENANCE',
  fleetSearchQuery: string
): EnrichedVehicleItem[] => {
  return allSearchableBikes.filter((v) => {
    if (fleetStatusFilter === 'ACTIVE' && v.status !== 'ACTIVE') return false;
    if (fleetStatusFilter === 'MAINTENANCE' && v.status !== 'MAINTENANCE') return false;

    if (fleetSearchQuery.trim()) {
      const q = toEnglishDigits(fleetSearchQuery.trim()).toLowerCase();
      const matchPlate = toEnglishDigits(v.plate_number || '').toLowerCase().includes(q);
      const matchKey = toEnglishDigits(v.key_number || '').toLowerCase().includes(q);
      const matchCourier = (v.courierName || '').toLowerCase().includes(q);
      return matchPlate || matchKey || matchCourier;
    }
    return true;
  });
};

export const computeOilSummary = (inventoryItems: InventoryItem[]) => {
  const oilItems = inventoryItems.filter(
    (item) =>
      item.type === 'oil' ||
      item.category === 'OIL' ||
      item.name.includes('زيت') ||
      item.name.toLowerCase().includes('oil')
  );

  const totalOilQty =
    oilItems.length > 0
      ? oilItems.reduce((acc, itm) => acc + (itm.branch_quantity ?? itm.quantity ?? 0), 0)
      : inventoryItems[0]
      ? inventoryItems[0].branch_quantity ?? inventoryItems[0].quantity ?? 0
      : 0;

  const oilItem = oilItems[0] || inventoryItems[0];
  const isOilLow = totalOilQty <= (oilItem?.min_alert || oilItem?.min_limit || 5);

  return { oilItem, totalOilQty, isOilLow };
};
