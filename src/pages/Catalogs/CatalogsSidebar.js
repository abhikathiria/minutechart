import { NavLink } from "react-router-dom";

const menu = [
  { label: "Main", path: "" },
  { label: "Products", path: "products" },
  // { label: "Price Rules", path: "price-rules" },
  // { label: "Catalogs", path: "catalogs" },
  // { label: "Categories", path: "categories" },
  // { label: "Promos", path: "promos" },
  // { label: "Stores", path: "stores" },
  // { label: "Product Store Groups", path: "product-store-groups" },
  // { label: "Shipping", path: "shipping" },
  // { label: "Reviews", path: "reviews" },
  // { label: "Features", path: "features" },
  // { label: "Subscriptions", path: "subscriptions" },
  // { label: "Container", path: "container" },
  // { label: "Port", path: "port" },
  // { label: "Certificate", path: "certificate" },
  // { label: "Reports", path: "reports" },
];

export default function CatalogsSidebar() {
  return (
    <aside className="party-sidebar">
      {menu.map(m => (
        <NavLink
          key={m.label}
          to={m.path}
          end
          className={({ isActive }) =>
            `sidebar-item ${isActive ? "active" : ""}`
          }
        >
          {m.label}
        </NavLink>
      ))}
    </aside>
  );
}
