import type { GigVehicle, GigShift } from "@/types/work/entities";
import type { GigShiftWithRelations } from "@/lib/work/gig-calculations";
import { GigQuickShiftPanel } from "@/components/work/gig-quick-shift-panel";
import { GigShiftList } from "@/components/work/gig-shift-list";

export function GigShiftsTab({
  vehicles,
  inProgressShift,
  shifts,
}: {
  vehicles: GigVehicle[];
  inProgressShift: GigShift | null;
  shifts: GigShiftWithRelations[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <GigQuickShiftPanel vehicles={vehicles} inProgressShift={inProgressShift} />
      <GigShiftList shifts={shifts} />
    </div>
  );
}
