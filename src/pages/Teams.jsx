import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Network,
  Users,
  UserPlus,
  ArrowRight,
  Sparkles,
  RefreshCw,
  UserRound,
  LayoutDashboard,
  WalletCards,
  Building2,
  Upload,
} from "lucide-react";

import "./Teams.css";

// ============================================================
// API
// ============================================================

const API_URL = "https://hr-dashboard-backend-lyb1.onrender.com";

// ============================================================
// DEFAULT TEAMS
// ============================================================

const DEFAULT_TEAMS = [
  {
    name: "Networking",
    description:
      "Network infrastructure, systems and operations",
    count: 0,
  },
  {
    name: "AI",
    description:
      "Artificial intelligence, machine learning and automation",
    count: 0,
  },
  {
    name: "HR",
    description:
      "Human resources, employee relations, recruitment and HR operations",
    count: 0,
  },
  {
    name: "Accounts",
    description:
      "Financial operations, accounting, billing and company finances",
    count: 0,
  },
  {
    name: "Administration",
    description:
      "Office administration, facilities and organizational operations",
    count: 0,
  },
];

// ============================================================
// NORMALIZE TEAM NAME
// ============================================================

const normalizeTeamName = (name) => {
  return String(name || "")
    .trim()
    .toLowerCase();
};

// ============================================================
// TEAM INFORMATION
// ============================================================

const getTeamInfo = (teamName) => {
  const name = normalizeTeamName(teamName);

  // ==========================================================
  // AI
  // ==========================================================

  if (
    name === "ai" ||
    name.includes("artificial intelligence")
  ) {
    return {
      className: "ai",
      color: "#7c3aed",
      lightColor: "#f5f3ff",
      borderColor: "#ddd6fe",
      icon: Sparkles,
    };
  }

  // ==========================================================
  // HR
  // ==========================================================

  if (
    name === "hr" ||
    name.includes("human resource")
  ) {
    return {
      className: "hr",
      color: "#e11d48",
      lightColor: "#fff1f2",
      borderColor: "#fecdd3",
      icon: UserRound,
    };
  }

  // ==========================================================
  // ACCOUNTS
  // ==========================================================

  if (
    name === "accounts" ||
    name === "account" ||
    name === "accounting" ||
    name.includes("account") ||
    name.includes("finance")
  ) {
    return {
      className: "accounts",
      color: "#059669",
      lightColor: "#ecfdf5",
      borderColor: "#a7f3d0",
      icon: WalletCards,
    };
  }

  // ==========================================================
  // ADMINISTRATION
  // ==========================================================

  if (
    name === "administration" ||
    name === "admin" ||
    name === "administrative" ||
    name.includes("administration") ||
    name.includes("administrative")
  ) {
    return {
      className: "administration",
      color: "#d97706",
      lightColor: "#fffbeb",
      borderColor: "#fde68a",
      icon: Building2,
    };
  }

  // ==========================================================
  // NETWORKING / DEFAULT
  // ==========================================================

  return {
    className: "networking",
    color: "#2563eb",
    lightColor: "#eff6ff",
    borderColor: "#bfdbfe",
    icon: Network,
  };
};

// ============================================================
// NORMALIZE API RESPONSE
// ============================================================

const normalizeTeamsResponse = (data) => {
  let receivedTeams = [];

  if (Array.isArray(data)) {
    receivedTeams = data;
  } else if (Array.isArray(data?.teams)) {
    receivedTeams = data.teams;
  } else if (Array.isArray(data?.data)) {
    receivedTeams = data.data;
  }

  const normalizedTeams = receivedTeams
    .map((team) => {
      if (typeof team === "string") {
        return {
          name: team.trim(),
          description:
            "Employees working in this team",
          count: 0,
        };
      }

      const name =
        team?.name ||
        team?.team_name ||
        team?.team ||
        "";

      const description =
        team?.description ||
        "Employees working in this team";

      const rawCount =
        team?.count ??
        team?.employee_count ??
        team?.employees_count ??
        team?.total_employees ??
        0;

      const count = Number(rawCount);

      return {
        name: String(name).trim(),
        description: String(description),
        count: Number.isFinite(count)
          ? count
          : 0,
      };
    })
    .filter((team) => team.name);

  DEFAULT_TEAMS.forEach((defaultTeam) => {
    const exists = normalizedTeams.some(
      (team) =>
        normalizeTeamName(team.name) ===
        normalizeTeamName(defaultTeam.name)
    );

    if (!exists) {
      normalizedTeams.push(defaultTeam);
    }
  });

  const uniqueTeams = [];
  const seen = new Set();

  normalizedTeams.forEach((team) => {
    const key = normalizeTeamName(team.name);

    if (!seen.has(key)) {
      seen.add(key);
      uniqueTeams.push(team);
    }
  });

  const order = {
    networking: 1,
    ai: 2,
    hr: 3,
    accounts: 4,
    administration: 5,
  };

  uniqueTeams.sort((a, b) => {
    const aName = normalizeTeamName(a.name);
    const bName = normalizeTeamName(b.name);

    const aOrder = order[aName] || 99;
    const bOrder = order[bName] || 99;

    return aOrder - bOrder;
  });

  return uniqueTeams;
};

// ============================================================
// TEAM CARD
// ============================================================

function TeamCard({ team, onOpen }) {
  const teamName =
    team?.name || "Unknown Team";

  const teamCount = Number(
    team?.count ?? 0
  );

  const info = getTeamInfo(teamName);

  const Icon = info.icon;

  return (
    <button
      type="button"
      className={`team-card ${info.className}`}
      onClick={() => onOpen(teamName)}
      aria-label={`Open ${teamName} team`}
    >
      <div
        className="team-color-bar"
        style={{
          background: info.color,
        }}
      />

      <div className="team-card-top">
        <div
          className="team-icon"
          style={{
            background: info.lightColor,
            color: info.color,
          }}
        >
          <Icon
            size={32}
            strokeWidth={1.8}
          />
        </div>

        <div
          className="team-arrow"
          style={{
            background: info.lightColor,
            color: info.color,
          }}
        >
          <ArrowRight size={20} />
        </div>
      </div>

      <div
        className="team-label"
        style={{
          color: info.color,
        }}
      >
        TEAM
      </div>

      <h2>
        {teamName}
      </h2>

      <p className="team-description">
        {team?.description ||
          "Employees working in this team"}
      </p>

      <div className="team-card-bottom">
        <div className="employee-count">
          <Users
            size={21}
            style={{
              color: info.color,
            }}
          />

          <span className="count-number">
            {teamCount}
          </span>

          <span className="count-text">
            {teamCount === 1
              ? "Employee"
              : "Employees"}
          </span>
        </div>

        <span
          className="view-team"
          style={{
            color: info.color,
          }}
        >
          View Team

          <ArrowRight size={16} />
        </span>
      </div>
    </button>
  );
}

// ============================================================
// TEAMS PAGE
// ============================================================

export default function Teams() {
  const navigate = useNavigate();

  const [teams, setTeams] =
    useState(DEFAULT_TEAMS);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ==========================================================
  // LOAD TEAMS
  // ==========================================================

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError("");

      console.log(
        "Loading teams from:",
        `${API_URL}/teams`
      );

      const response = await fetch(
        `${API_URL}/teams`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      console.log(
        "Teams HTTP status:",
        response.status
      );

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}`
        );
      }

      const data =
        await response.json();

      console.log(
        "Teams API response:",
        data
      );

      const normalized =
        normalizeTeamsResponse(data);

      console.log(
        "Teams to render:",
        normalized
      );

      setTeams(normalized);

    } catch (err) {
      console.error(
        "Teams loading error:",
        err
      );

      setTeams(DEFAULT_TEAMS);

      setError(
        "Unable to connect to the teams service. Showing available teams."
      );

    } finally {
      setLoading(false);

      console.log(
        "Teams loading finished"
      );
    }
  };

  // ==========================================================
  // LOAD WHEN PAGE OPENS
  // ==========================================================

  useEffect(() => {
    loadTeams();
  }, []);

  // ==========================================================
  // OPEN TEAM
  // ==========================================================

  const openTeam = (teamName) => {
    console.log(
      "Opening team:",
      teamName
    );

    navigate(
      `/teams/${encodeURIComponent(teamName)}`
    );
  };

  // ==========================================================
  // DASHBOARD
  // ==========================================================

  const goToDashboard = () => {
    navigate("/");
  };

  // ==========================================================
  // ADD EMPLOYEE
  // ==========================================================

  const goToAddEmployee = () => {
    navigate("/employees/add");
  };

  // ==========================================================
  // IMPORT EXCEL
  // ==========================================================

  const goToImportExcel = () => {
    navigate("/import");
  };

  // ==========================================================
  // MANAGE EMPLOYEES
  // ==========================================================

  const goToManageEmployees = () => {
    navigate("/employees");
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="teams-page">

      {/* ====================================================
          PAGE HEADER
      ==================================================== */}

      <header className="teams-header">

        <div className="teams-title-section">

          <div className="section-eyebrow">

            <Sparkles size={17} />

            <span>
              MapGenesys
            </span>

          </div>

          <h1>
            Our Teams
          </h1>

          <p>
            Explore teams and discover the people
            behind our organization.
          </p>

        </div>

        {/* ==================================================
            HEADER ACTIONS
        ================================================== */}

        <div
          className="header-actions"
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >

          {/* DASHBOARD */}

          <button
            type="button"
            className="dashboard-btn"
            onClick={goToDashboard}
          >
            <LayoutDashboard size={19} />

            <span>
              Dashboard
            </span>
          </button>

          {/* ADD EMPLOYEE */}

          <button
            type="button"
            className="add-employee-btn"
            onClick={goToAddEmployee}
          >
            <UserPlus size={20} />

            <span>
              Add Employee
            </span>
          </button>

          {/* IMPORT EXCEL */}

          <button
            type="button"
            onClick={goToImportExcel}
            style={{
              height: "56px",
              padding: "0 22px",
              border: "none",
              borderRadius: "12px",
              background:
                "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "9px",
              boxShadow:
                "0 6px 18px rgba(37, 99, 235, 0.30)",
            }}
          >
            <Upload size={19} />

            <span>
              Import Excel
            </span>
          </button>

          {/* ==================================================
              MANAGE EMPLOYEES
              ORANGE BUTTON
          ================================================== */}

          <button
            type="button"
            onClick={goToManageEmployees}
            style={{
              height: "56px",
              padding: "0 22px",
              border: "none",
              borderRadius: "12px",
              background:
                "linear-gradient(135deg, #f59e0b, #ea580c)",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "9px",
              boxShadow:
                "0 6px 18px rgba(234, 88, 12, 0.30)",
            }}
          >
            <Users size={20} />

            <span>
              Manage Employees
            </span>
          </button>

        </div>

      </header>

      {/* ====================================================
          ERROR NOTICE
      ==================================================== */}

      {!loading && error && (

        <div className="teams-notice">

          <span>
            {error}
          </span>

          <button
            type="button"
            className="retry-btn"
            onClick={loadTeams}
          >
            <RefreshCw size={17} />

            <span>
              Retry
            </span>
          </button>

        </div>

      )}

      {/* ====================================================
          LOADING
      ==================================================== */}

      {loading && (

        <div className="teams-state">

          <RefreshCw
            size={34}
            className="loading-icon"
          />

          <h3>
            Loading teams...
          </h3>

          <p>
            Getting your teams from the server.
          </p>

        </div>

      )}

      {/* ====================================================
          TEAM CONTENT
      ==================================================== */}

      {!loading && (

        <section className="teams-content">

          {/* ==================================================
              SUMMARY
          ================================================== */}

          <div className="teams-summary">

            <span className="summary-number">
              {teams.length}
            </span>

            <span className="summary-text">
              {teams.length === 1
                ? "team available"
                : "teams available"}
            </span>

          </div>

          {/* ==================================================
              TEAM GRID
          ================================================== */}

          <div className="teams-grid">

            {teams.length > 0 ? (

              teams.map((team, index) => (

                <TeamCard
                  key={`${normalizeTeamName(
                    team.name
                  )}-${index}`}
                  team={team}
                  onOpen={openTeam}
                />

              ))

            ) : (

              <div className="empty-teams">

                <Network size={45} />

                <h3>
                  No teams found
                </h3>

                <p>
                  There are currently no teams
                  available.
                </p>

              </div>

            )}

          </div>

        </section>

      )}

    </div>
  );
}