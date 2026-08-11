import type { LucideIcon } from 'lucide-react';
import {
  BookOpen, BriefcaseBusiness, Bus, ChefHat, CircleUserRound, Clapperboard, Dumbbell,
  Gamepad2, GraduationCap, Handshake, Headphones, HeartHandshake, House, Laptop,
  Luggage, MoonStar, Palette, Presentation, ShoppingBag, Sofa, Sparkles, Stethoscope,
  UsersRound, Utensils, WashingMachine, Footprints
} from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  work: BriefcaseBusiness, meeting: Presentation, studying: Laptop, class: GraduationCap, commute: Bus,
  meal: Utensils, cooking: ChefHat, chores: WashingMachine, shopping: ShoppingBag, travel: Luggage,
  sleep: MoonStar, rest: Sofa, walking: Footprints, exercise: Dumbbell, unwell: Stethoscope,
  alone: CircleUserRound, family: House, friends: UsersRound, partner: HeartHandshake, social: Handshake,
  reading: BookOpen, movie: Clapperboard, gaming: Gamepad2, music: Headphones, creating: Palette
};

export function EmotionActivityIcon({ activityId }: { activityId: string }) {
  const Icon = icons[activityId] ?? Sparkles;
  return <Icon className="emotion-activity-icon" aria-hidden="true" />;
}
