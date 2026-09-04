import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Teams from "./pages/Teams";
import TeamEmployees from "./pages/TeamEmployees";
import EmployeeProfile from "./pages/EmployeeProfile";
import AllEmployees from "./pages/AllEmployees";
import ImportExcel from "./pages/ImportExcel";
import AddEmployee from "./pages/AddEmployee";
import PayrollDetails from "./pages/PayrollDetails";
import CompanyExpenses from "./pages/CompanyExpenses";
import ISOCertifications from "./pages/ISOCertifications";
import JD from "./pages/JD";
import DocCollection from "./pages/DocCollection";

function App() {
  return (
    <BrowserRouter>

      <div className="app-layout">

        {/* =========================================
            SIDEBAR
        ========================================= */}
        <Sidebar />

        {/* =========================================
            MAIN CONTENT
        ========================================= */}
        <main className="main-content">

          <Routes>

            {/* =====================================================
                DASHBOARD
                ===================================================== */}
            <Route
              path="/"
              element={<Dashboard />}
            />

            {/* =====================================================
                TEAMS
                ===================================================== */}
            <Route
              path="/teams"
              element={<Teams />}
            />

            {/* =====================================================
                TEAM EMPLOYEES
                ===================================================== */}
            <Route
              path="/teams/:teamName"
              element={<TeamEmployees />}
            />

            {/* =====================================================
                ALL EMPLOYEES
                ===================================================== */}
            <Route
              path="/employees"
              element={<AllEmployees />}
            />

            {/* =====================================================
                ADD EMPLOYEE
                ===================================================== */}
            <Route
              path="/employees/add"
              element={<AddEmployee />}
            />

            {/* =====================================================
                EMPLOYEE PROFILE
                ===================================================== */}
            <Route
              path="/employees/:employeeId"
              element={<EmployeeProfile />}
            />

            {/* =====================================================
                OLD EMPLOYEE URL
                ===================================================== */}
            <Route
              path="/employee/:employeeId"
              element={<EmployeeProfile />}
            />

            {/* =====================================================
                PAYROLL DETAILS
                ===================================================== */}
            <Route
              path="/payroll-details"
              element={<PayrollDetails />}
            />

            {/* =====================================================
                COMPANY EXPENSES
                ===================================================== */}
            <Route
              path="/company-expenses"
              element={<CompanyExpenses />}
            />

            {/* =====================================================
                JD
                ===================================================== */}
            <Route
              path="/jd"
              element={<JD />}
            />

            {/* =====================================================
                NEW DOC COLLECTIONS
                ===================================================== */}
            <Route path="/recruitment" element={<DocCollection title="Recruitment" basePath="recruitment" />} />
            <Route path="/onboarding" element={<DocCollection title="Onboarding" basePath="onboarding" />} />
            <Route path="/leave-policies" element={<DocCollection title="Leave Policies" basePath="leave-policies" />} />
            <Route path="/asset-inventory" element={<DocCollection title="Asset Inventory" basePath="asset-inventory" />} />
            <Route path="/exit" element={<DocCollection title="Exit Documents" basePath="exit" />} />
            <Route path="/workout-mom" element={<DocCollection title="Workout Sheet MOM" basePath="workout-mom" />} />

            {/* =====================================================
                ISO CERTIFICATIONS
                ===================================================== */}
            <Route
              path="/iso-certifications"
              element={<ISOCertifications />}
            />

            {/* =====================================================
                IMPORT EXCEL
                ===================================================== */}
            <Route
              path="/import"
              element={<ImportExcel />}
            />

          </Routes>

        </main>

      </div>

    </BrowserRouter>
  );
}

export default App; 