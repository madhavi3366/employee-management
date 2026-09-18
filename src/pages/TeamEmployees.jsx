import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Sidebar from "../components/Sidebar";

import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Network,
  Search,
  Users,
  AlertCircle,
  RefreshCw,
  UserRound,
  WalletCards,
  Settings,
} from "lucide-react";

import "./TeamEmployees.css";

const API_URL = "https://hr-dashboard-backend-lyb1.onrender.com";

// ============================================================
// TEAM CONFIGURATION
// ============================================================

const TEAM_CONFIG = {
  networking: {
    name: "Networking",
    description:
      "Network infrastructure, systems and operations",
    icon: Network,
    className: "networking",
  },

  ai: {
    name: "AI",
    description:
      "Artificial intelligence, machine learning and automation",
    icon: Brain,
    className: "ai",
  },

  hr: {
    name: "HR",
    description:
      "Human resources, employee management and organizational operations",
    icon: UserRound,
    className: "hr",
  },

  accounts: {
    name: "Accounts",
    description:
      "Finance, accounting, payroll and financial operations",
    icon: WalletCards,
    className: "accounts",
  },

  administration: {
    name: "Administration",
    description:
      "Administration, office operations and organizational support",
    icon: Settings,
    className: "administration",
  },
};

// ============================================================
// NORMALIZE TEAM NAME
// ============================================================

const normalizeTeamName = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (
    normalized === "network" ||
    normalized === "networking"
  ) {
    return "networking";
  }

  if (
    normalized === "ai" ||
    normalized === "artificial intelligence"
  ) {
    return "ai";
  }

  if (
    normalized === "hr" ||
    normalized === "human resources" ||
    normalized === "human resource"
  ) {
    return "hr";
  }

  if (
    normalized === "accounts" ||
    normalized === "account"
  ) {
    return "accounts";
  }

  if (
    normalized === "administration" ||
    normalized === "admin"
  ) {
    return "administration";
  }

  return "";
};

// ============================================================
// COMPONENT
// ============================================================

export default function TeamEmployees() {
  const { teamName } = useParams();
  const navigate = useNavigate();

  // ==========================================================
  // TEAM
  // ==========================================================

  const normalizedTeam = normalizeTeamName(teamName);

  const teamConfig =
    TEAM_CONFIG[normalizedTeam] ||
    TEAM_CONFIG.networking;

  const displayTeam = teamConfig.name;
  const teamDescription = teamConfig.description;
  const TeamIcon = teamConfig.icon;
  const teamClass = teamConfig.className;

  // ==========================================================
  // STATE
  // ==========================================================

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==========================================================
  // LOAD TEAM EMPLOYEES
  // ==========================================================

  const loadEmployees = async () => {
    setLoading(true);
    setError("");

    try {
      // ------------------------------------------------------
      // Use the actual team from the URL.
      // ------------------------------------------------------

      const url =
        `${API_URL}/teams/${encodeURIComponent(
          displayTeam
        )}/employees`;

      console.log(
        "Loading team employees:",
        displayTeam,
        url
      );

      const response = await fetch(url);

      // ------------------------------------------------------
      // BACKEND ERROR
      // ------------------------------------------------------

      if (!response.ok) {
        let errorMessage =
          `Server returned ${response.status}`;

        try {
          const errorData =
            await response.json();

          if (errorData?.detail) {
            errorMessage =
              errorData.detail;
          }
        } catch {
          // Ignore invalid JSON
        }

        throw new Error(errorMessage);
      }

      // ------------------------------------------------------
      // READ RESPONSE
      // ------------------------------------------------------

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          "Invalid employee data received from server."
        );
      }

      console.log(
        `${displayTeam} employees:`,
        data
      );

      setEmployees(data);
    } catch (error) {
      console.error(
        `Failed to load ${displayTeam} employees:`,
        error
      );

      setError(
        error?.message ||
          `Unable to load ${displayTeam} employees.`
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // LOAD WHEN TEAM CHANGES
  // ==========================================================

  useEffect(() => {
    loadEmployees();
  }, [displayTeam]);

  // ==========================================================
  // SEARCH
  // ==========================================================

  const searchText =
    search
      .toLowerCase()
      .trim();

  const filteredEmployees =
    employees.filter(
      (employee) => {
        if (!searchText) {
          return true;
        }

        return (
          employee.name
            ?.toLowerCase()
            .includes(searchText) ||

          employee.employee_id
            ?.toString()
            .toLowerCase()
            .includes(searchText) ||

          employee.designation
            ?.toLowerCase()
            .includes(searchText) ||

          employee.project_name
            ?.toLowerCase()
            .includes(searchText) ||

          employee.personal_email
            ?.toLowerCase()
            .includes(searchText)
        );
      }
    );

  // ==========================================================
  // GO TO EMPLOYEE PROFILE
  // ==========================================================

  const goToProfile = (employeeId) => {
    if (!employeeId) {
      return;
    }

    navigate(
      `/employees/${encodeURIComponent(
        employeeId
      )}`
    );
  };

  // ==========================================================
  // ADD EMPLOYEE
  // ==========================================================

  const goToAddEmployee = () => {
    navigate(
      `/employees/add?team=${encodeURIComponent(
        displayTeam
      )}`
    );
  };

  // ==========================================================
  // INVALID TEAM
  // ==========================================================

  if (!normalizedTeam) {
    return (
      <div className="app">
        <Sidebar />

        <main className="main team-employees-page">
          <button
            className="back-button"
            onClick={() =>
              navigate("/teams")
            }
          >
            <ArrowLeft size={18} />

            Back to Teams
          </button>

          <div className="employee-error">
            <AlertCircle size={40} />

            <h3>
              Invalid Team
            </h3>

            <p>
              The requested team does not exist.
            </p>

            <button
              className="retry-button"
              onClick={() =>
                navigate("/teams")
              }
            >
              <ArrowLeft size={17} />

              Back to Teams
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="app">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <Sidebar />

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="main team-employees-page">

        {/* ==================================================
            BACK BUTTON
        ================================================== */}

        <button
          className="back-button"
          onClick={() =>
            navigate("/teams")
          }
        >
          <ArrowLeft size={18} />

          Back to Teams
        </button>

        {/* ==================================================
            TEAM HEADER
        ================================================== */}

        <div
          className={
            `team-employees-header ${
              teamClass
            }-header`
          }
        >

          {/* ICON */}

          <div className="team-header-icon">
            <TeamIcon
              size={38}
              strokeWidth={1.8}
            />
          </div>

          {/* TEAM INFORMATION */}

          <div className="team-header-content">

            <span className="team-header-label">
              OUR TEAM
            </span>

            <h1>
              {displayTeam}
            </h1>

            <p>
              {teamDescription}
            </p>

          </div>

          {/* MEMBER COUNT */}

          <div className="team-member-count">

            <Users size={20} />

            <div>

              <strong>
                {employees.length}
              </strong>

              <span>
                Employees
              </span>

            </div>

          </div>

        </div>

        {/* ==================================================
            TOOLBAR
        ================================================== */}

        <div className="employee-list-toolbar">

          {/* SEARCH */}

          <div className="employee-search">

            <Search size={20} />

            <input
              type="text"
              placeholder={
                `Search ${displayTeam} employees...`
              }
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

          </div>

          {/* RESULT COUNT */}

          <div className="employee-result-count">

            {filteredEmployees.length}

            {" "}

            employee
            {filteredEmployees.length !== 1
              ? "s"
              : ""}

          </div>

          {/* ADD EMPLOYEE */}

          <button
            type="button"
            className={
              `team-add-employee-button ${
                teamClass
              }-add-button`
            }
            onClick={
              goToAddEmployee
            }
          >

            <UserRound
              size={18}
            />

            Add Employee

          </button>

        </div>

        {/* ==================================================
            LOADING
        ================================================== */}

        {loading && (

          <div className="employee-loading">

            <div className="loading-spinner"></div>

            <p>
              Loading {displayTeam} employees...
            </p>

          </div>

        )}

        {/* ==================================================
            ERROR
        ================================================== */}

        {!loading &&
          error && (

            <div className="employee-error">

              <AlertCircle
                size={40}
              />

              <h3>
                Unable to load employees
              </h3>

              <p>
                {error}
              </p>

              <button
                className="retry-button"
                onClick={
                  loadEmployees
                }
              >

                <RefreshCw
                  size={17}
                />

                Try Again

              </button>

            </div>

          )}

        {/* ==================================================
            EMPTY
        ================================================== */}

        {!loading &&
          !error &&
          filteredEmployees.length === 0 && (

            <div className="employee-empty">

              <Users
                size={42}
              />

              <h3>
                No employees found
              </h3>

              <p>
                {search
                  ? "Try a different search."
                  : `There are no employees in the ${displayTeam} team.`}
              </p>

              {/* ADD FIRST EMPLOYEE */}

              {!search && (

                <button
                  type="button"
                  className={
                    `team-empty-add-button ${
                      teamClass
                    }-empty-add-button`
                  }
                  onClick={
                    goToAddEmployee
                  }
                >

                  <UserRound
                    size={18}
                  />

                  Add {displayTeam} Employee

                </button>

              )}

            </div>

          )}

        {/* ==================================================
            EMPLOYEE CARDS
        ================================================== */}

        {!loading &&
          !error &&
          filteredEmployees.length > 0 && (

            <div className="employee-cards">

              {filteredEmployees.map(
                (employee) => (

                  <div
                    className={
                      `employee-card ${
                        teamClass
                      }-employee-card`
                    }
                    key={
                      employee.employee_id ||
                      employee.id
                    }
                    onClick={() =>
                      goToProfile(
                        employee.employee_id
                      )
                    }
                  >

                    {/* AVATAR */}

                    <div className="employee-avatar">

                      {employee.name
                        ?.charAt(0)
                        .toUpperCase() ||
                        "?"}

                    </div>

                    {/* EMPLOYEE INFORMATION */}

                    <div className="employee-card-info">

                      <h3>
                        {employee.name ||
                          "Unknown Employee"}
                      </h3>

                      <span className="employee-id">

                        {employee.employee_id ||
                          "No ID"}

                      </span>

                      <p>
                        {employee.designation ||
                          "Designation not available"}
                      </p>

                      {/* PROJECT */}

                      {employee.project_name && (

                        <span className="employee-project">

                          {employee.project_name}

                        </span>

                      )}

                    </div>

                    {/* RIGHT SIDE */}

                    <div className="employee-card-right">

                      {/* STATUS */}

                      <span
                        className={
                          `employee-status ${
                            employee.status
                              ?.toLowerCase() ===
                            "active"
                              ? "status-active"
                              : "status-exited"
                          }`
                        }
                      >

                        <span className="status-dot"></span>

                        {employee.status ||
                          "Unknown"}

                      </span>

                      {/* ARROW */}

                      <div className="employee-arrow">

                        <ArrowRight
                          size={19}
                        />

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

      </main>

    </div>
  );
}