/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIAssistant from './pages/AIAssistant';
import AdminBusinesses from './pages/AdminBusinesses';
import AdminDashboard from './pages/AdminDashboard';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import Debts from './pages/Debts';
import Products from './pages/Products';
import RegisterBusiness from './pages/RegisterBusiness';
import Sales from './pages/Sales';
import Settings from './pages/Settings';
import Warehouses from './pages/Warehouses';
import Returns from './pages/Returns';
import Analytics from './pages/Analytics';
import CustomizeDashboard from './pages/CustomizeDashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIAssistant": AIAssistant,
    "AdminBusinesses": AdminBusinesses,
    "AdminDashboard": AdminDashboard,
    "Customers": Customers,
    "Dashboard": Dashboard,
    "Debts": Debts,
    "Products": Products,
    "RegisterBusiness": RegisterBusiness,
    "Sales": Sales,
    "Settings": Settings,
    "Warehouses": Warehouses,
    "Returns": Returns,
    "Analytics": Analytics,
    "CustomizeDashboard": CustomizeDashboard,
}

export const pagesConfig = {
    mainPage: "RegisterBusiness",
    Pages: PAGES,
    Layout: __Layout,
};