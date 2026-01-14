import { NavLink } from "react-router-dom";

const menu = [
    { label: "Main", path: "" },
    { label: "Requirements", path: "requirements" },
    { label: "Request for Quote", path: "quote" },
    { label: "Purchase Orders", path: "purchase-orders" },
    { label: "Purchase Returns", path: "purchase-returns" },
    { label: "Reports", path: "reports" },
];

export default function ProcurementsSidebar() {
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
