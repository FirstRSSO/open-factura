import type { RideFinalBlockColumn, RidePdfOptions } from "./types";

/**
 * Alto que debe caber desde el borde superior del bloque final: el propio
 * bloque y lo que el llamador reservó debajo (desde arriba o bajo columnas).
 */
export function requiredFinalBlockHeight(
  columns: RideFinalBlockColumn[],
  options: RidePdfOptions
): number {
  const own = Math.max(0, ...columns.map((column) => column.height));
  const reserved = (options.finalBlockReserves ?? []).map((reserve) => {
    const above = columns.filter(
      (column) =>
        reserve.x < column.x + column.width && column.x < reserve.x + reserve.width
    );
    return Math.max(0, ...above.map((column) => column.height)) + reserve.height;
  });
  return Math.max(own, options.finalBlockMinHeight ?? 0, ...reserved);
}
