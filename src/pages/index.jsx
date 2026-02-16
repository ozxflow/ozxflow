import Layout from "./Layout.jsx";

import Tasks from "./Tasks";

import QuickTasks from "./QuickTasks";

import Reports from "./Reports";

import Setup from "./Setup";

import Leads from "./Leads";

import ManageLeadSources from "./ManageLeadSources";

import ChatBot from "./ChatBot";

import SystemHistory from "./SystemHistory";

import CustomersPage from "./CustomersPage";

import Jobs from "./Jobs";

import Suppliers from "./Suppliers";

import Bot from "./Bot";

import Settings from "./Settings";

import Quotes from "./Quotes";

import Employees from "./Employees";

import EmployeeDetails from "./EmployeeDetails";

import Dashboard from "./Dashboard";

import SupplierOrders from "./SupplierOrders";

import Customers from "./Customers";

import CustomerDetails from "./CustomerDetails";

import Invoices from "./Invoices";

import EmployeesNew from "./EmployeesNew";

import Catalog from "./Catalog";

import RenewSubscription from "./RenewSubscription";

import Login from "./Login";
import ResetPassword from "./ResetPassword";
import Signup from "./Signup";
import SuperAdmin from "./SuperAdmin";

import { Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Tasks: Tasks,
    
    QuickTasks: QuickTasks,
    
    Reports: Reports,
    
    Setup: Setup,
    
    Leads: Leads,
    
    ManageLeadSources: ManageLeadSources,
    
    ChatBot: ChatBot,
    
    SystemHistory: SystemHistory,
    
    CustomersPage: CustomersPage,
    
    Jobs: Jobs,
    
    Suppliers: Suppliers,
    
    Bot: Bot,
    
    Settings: Settings,
    
    Quotes: Quotes,
    
    Employees: Employees,
    
    EmployeeDetails: EmployeeDetails,
    
    Dashboard: Dashboard,
    
    SupplierOrders: SupplierOrders,
    
    Customers: Customers,
    
    CustomerDetails: CustomerDetails,
    
    Invoices: Invoices,
    
    EmployeesNew: EmployeesNew,
    
    Catalog: Catalog,
    
    RenewSubscription: RenewSubscription,

    SuperAdmin: SuperAdmin,

}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    const PageComponent = PAGES[currentPage] || Tasks;

    return (
        <Layout currentPageName={currentPage}>
            <PageComponent />
        </Layout>
    );
}

export default function Pages() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/*" element={<PagesContent />} />
        </Routes>
    );
}