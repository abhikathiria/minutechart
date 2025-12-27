import { Outlet } from "react-router-dom";
import CatalogsSidebar from "./CatalogsSidebar";
import "./catalogs.css";

export default function CatalogsLayout() {
  return (
    <div className="party-layout">
      <CatalogsSidebar />
      <div className="party-content">
        <Outlet />
      </div>
    </div>
  );
}
