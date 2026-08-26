// Single source of truth for sidebar nav + routing. Adding a department is:
// 1) flip enabled: true here and give it a route path, 2) add the page under
// src/pages, 3) add its API endpoint + seed module on the server. No shared
// component changes required.
import {
  BarChart3,
  Boxes,
  Wallet,
  Headset,
  Megaphone,
  Factory,
  Truck,
} from "lucide-react";

export const DEPARTMENTS = [
  { slug: "sales", label: "Sales", path: "/sales", icon: BarChart3, enabled: true },
  { slug: "operations", label: "Operations", path: "/operations", icon: Truck, enabled: true },
  { slug: "inventory", label: "Inventory", path: "/inventory", icon: Boxes, enabled: true },
  { slug: "finance", label: "Finance", path: "/finance", icon: Wallet, enabled: true },
  { slug: "customer-service", label: "Customer Service", path: "/customer-service", icon: Headset, enabled: true },
  { slug: "marketing", label: "Marketing", path: "/marketing", icon: Megaphone, enabled: true },
  { slug: "manufacturing", label: "Manufacturing", path: "/manufacturing", icon: Factory, enabled: false },
];
