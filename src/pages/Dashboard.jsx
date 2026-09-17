
import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";

import { getEmployees } from "../services/api";

export default function Dashboard() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // LOAD EMPLOYEES
  // ============================================================

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setLoading(true);

        const data = await getEmployees();

        console.log("Dashboard employees:", data);

        setEmployees(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load employees:", error);

        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, []);

  // ============================================================
  // TEAM NORMALIZATION
  // ============================================================

  const normalizeTeam = (team) => {
    if (!team) {
      return "";
    }

    const normalized = String(team)
      .trim()
      .toLowerCase();

    // ----------------------------------------------------------
    // NETWORKING
    // ----------------------------------------------------------

    if (
      [
        "network",
        "networking",
        "network team",
        "networking team",
      ].includes(normalized) ||
      normalized.includes("network")
    ) {
      return "networking";
    }

    // ----------------------------------------------------------
    // AI
    // ----------------------------------------------------------

    if (
      [
        "ai",
        "ai team",
        "artificial intelligence",
        "artificial intelligence team",
      ].includes(normalized) ||
      normalized.includes("artificial intelligence")
    ) {
      return "ai";
    }

    // ----------------------------------------------------------
    // HR
    // ----------------------------------------------------------

    if (
      [
        "hr",
        "hr team",
        "human resources",
        "human resource",
        "human resources team",
        "human resource team",
      ].includes(normalized) ||
      normalized.includes("human resource")
    ) {
      return "hr";
    }

    // ----------------------------------------------------------
    // ACCOUNTS
    // ----------------------------------------------------------

    if (
      [
        "accounts",
        "account",
        "accounts team",
        "account team",
        "accounting",
        "accounting team",
        "finance",
        "finance team",
      ].includes(normalized) ||
      normalized.includes("account") ||
      normalized.includes("finance")
    ) {
      return "accounts";
    }

    // ----------------------------------------------------------
    // ADMINISTRATION
    // ----------------------------------------------------------

    if (
      [
        "administration",
        "administration team",
        "admin",
        "admin team",
        "administrative",
        "administrative team",
      ].includes(normalized) ||
      normalized.includes("administration") ||
      normalized.includes("administrative")
    ) {
      return "administration";
    }

    return normalized;
  };

  // ============================================================
  // STATUS NORMALIZATION
  // ============================================================

  const normalizeStatus = (status) => {
    if (!status) {
      return "";
    }

    return String(status)
      .trim()
      .toLowerCase();
  };

  // ============================================================
  // ACTIVE EMPLOYEES
  // ============================================================

  const activeEmployees = employees.filter(
    (employee) =>
      normalizeStatus(employee.status) === "active"
  );

  // ============================================================
  // DASHBOARD COUNTS
  // ============================================================

  /*
   * Total Employees = ACTIVE employees only.
   *
   * Exited employees are NOT included in Total Employees.
   */

  const total = activeEmployees.length;

  // ============================================================
  // TEAM COUNTS
  // ============================================================

  const networking = activeEmployees.filter(
    (employee) =>
      normalizeTeam(employee.team) ===
      "networking"
  ).length;

  const ai = activeEmployees.filter(
    (employee) =>
      normalizeTeam(employee.team) ===
      "ai"
  ).length;

  const hr = activeEmployees.filter(
    (employee) =>
      normalizeTeam(employee.team) ===
      "hr"
  ).length;

  const accounts = activeEmployees.filter(
    (employee) =>
      normalizeTeam(employee.team) ===
      "accounts"
  ).length;

  const administration = activeEmployees.filter(
    (employee) =>
      normalizeTeam(employee.team) ===
      "administration"
  ).length;

  // ============================================================
  // ACTIVE COUNT
  // ============================================================

  const active = activeEmployees.length;

  // ============================================================
  // EXITED COUNT
  // ============================================================

  const exited = employees.filter(
    (employee) =>
      normalizeStatus(employee.status) ===
      "exited"
  ).length;

  // ============================================================
  // DEBUG
  // ============================================================

  console.log("Dashboard counts:", {
    total,
    networking,
    ai,
    hr,
    accounts,
    administration,
    active,
    exited,
  });

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="app-layout">

      {/* ==================================================
          SIDEBAR
      ================================================== */}

      <Sidebar />

      {/* ==================================================
          MAIN CONTENT
      ================================================== */}

      <main className="dashboard-main">

        {/* ==================================================
            HEADER
        ================================================== */}

        <h1>
          Employee Dashboard
        </h1>

        <p className="subtitle">
          Overview of Mapgenesys employees
        </p>

        {/* ==================================================
            LOADING
        ================================================== */}

        {loading ? (

          <div className="loading-state">
            Loading employees...
          </div>

        ) : (

          <div className="stats">

            {/* ==================================================
                TOTAL EMPLOYEES
            ================================================== */}

            <div className="stat-card">

              <div className="stat-icon total-icon">
                👥
              </div>

              <h3>
                Total Employees
              </h3>

              <strong>
                {total}
              </strong>

            </div>

            {/* ==================================================
                NETWORKING TEAM
            ================================================== */}

            <div className="stat-card">

              <div className="stat-icon network-icon">
                🌐
              </div>

              <h3>
                Networking Team
              </h3>

              <strong>
                {networking}
              </strong>

            </div>

            {/* ==================================================
                AI TEAM
            ================================================== */}

            <div className="stat-card">

              <div className="stat-icon ai-icon">
                🧠
              </div>

              <h3>
                AI Team
              </h3>

              <strong>
                {ai}
              </strong>

            </div>

            {/* ==================================================
                HR TEAM
            ================================================== */}

            <div className="stat-card">

              <div className="stat-icon hr-icon">
                👤
              </div>

              <h3>
                HR Team
              </h3>

              <strong>
                {hr}
              </strong>

            </div>

            {/* ==================================================
                ACCOUNTS TEAM
            ================================================== */}

            <div className="stat-card">

              <div className="stat-icon accounts-icon">
                💰
              </div>

              <h3>
                Accounts
              </h3>

              <strong>
                {accounts}
              </strong>

            </div>

            {/* ==================================================
                ADMINISTRATION TEAM
            ================================================== */}

            <div className="stat-card">

              <div className="stat-icon administration-icon">
                🏢
              </div>

              <h3>
                Administration
              </h3>

              <strong>
                {administration}
              </strong>

            </div>

            {/* ==================================================
                ACTIVE
            ================================================== */}

            <div className="stat-card">

              <div className="stat-icon active-icon">
                ✓
              </div>

              <h3>
                Active
              </h3>

              <strong>
                {active}
              </strong>

            </div>

            {/* ==================================================
                EXITED
            ================================================== */}

            <div className="stat-card">

              <div className="stat-icon exited-icon">
                ↗
              </div>

              <h3>
                Exited
              </h3>

              <strong>
                {exited}
              </strong>

            </div>

          </div>

        )}

      </main>

    </div>
  );
}
