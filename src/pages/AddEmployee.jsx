import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  UserPlus,
  Save,
  CheckCircle,
  AlertCircle,
  Network,
  Sparkles,
  Users,
  WalletCards,
  Settings,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import "./AddEmployee.css";

const API_URL = "https://hr-dashboard-backend-lyb1.onrender.com";

// ============================================================
// INITIAL FORM
// ============================================================

const initialForm = {
  employee_id: "",
  serial_no: "",
  name: "",
  team: "",
  designation: "",
  grade: "",
  performance: "",
  project_name: "",
  doj: "",
  dob: "",
  status: "Active",

  // ----------------------------------------------------------
  // PERSONAL
  // ----------------------------------------------------------

  qualification: "",
  contact_number: "",
  personal_email: "",
  name_as_per_aadhar: "",
  aadhar_number: "",
  father_name: "",
  pan_no: "",





  // ----------------------------------------------------------
  // OTHER
  // ----------------------------------------------------------

  remarks: "",
};

// ============================================================
// TEAM CONFIGURATION
// ============================================================

const teamOptions = [
  {
    value: "Networking",
    label: "Networking",
    description: "Network infrastructure and operations",
    icon: Network,
  },
  {
    value: "AI",
    label: "AI",
    description: "Artificial intelligence and automation",
    icon: Sparkles,
  },
  {
    value: "HR",
    label: "HR",
    description: "Human resources and employee management",
    icon: Users,
  },
  {
    value: "Accounts",
    label: "Accounts",
    description:
      "Finance, accounting, payroll and financial operations",
    icon: WalletCards,
  },
  {
    value: "Administration",
    label: "Administration",
    description:
      "Administration, office operations and organizational support",
    icon: Settings,
  },
];

// ============================================================
// VALID TEAMS
// ============================================================

const VALID_TEAMS = teamOptions.map((team) => team.value);

// ============================================================
// TEAM CLASS
// ============================================================

const getTeamClass = (team) => {
  return String(team || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
};

// ============================================================
// NORMALIZE TEAM FROM URL
// ============================================================

const getAutomaticTeam = (requestedTeam) => {
  const normalized = String(requestedTeam || "")
    .trim()
    .toLowerCase();

  if (
    normalized === "networking" ||
    normalized === "network"
  ) {
    return "Networking";
  }

  if (
    normalized === "ai" ||
    normalized === "artificial intelligence"
  ) {
    return "AI";
  }

  if (
    normalized === "hr" ||
    normalized === "human resources" ||
    normalized === "human resource"
  ) {
    return "HR";
  }

  if (
    normalized === "accounts" ||
    normalized === "account"
  ) {
    return "Accounts";
  }

  if (
    normalized === "administration" ||
    normalized === "admin"
  ) {
    return "Administration";
  }

  return "";
};

// ============================================================
// COMPONENT
// ============================================================

export default function AddEmployee() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ==========================================================
  // AUTOMATIC TEAM SELECTION
  //
  // Examples:
  //
  // /employees/add?team=HR
  // /employees/add?team=Accounts
  // /employees/add?team=Administration
  //
  // ==========================================================

  const requestedTeam = searchParams.get("team") || "";

  const automaticTeam =
    getAutomaticTeam(requestedTeam);

  const [form, setForm] = useState({
    ...initialForm,
    team: automaticTeam,
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // ==========================================================
  // HANDLE INPUT CHANGE
  // ==========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // ==========================================================
  // TEAM SELECTION
  // ==========================================================

  const handleTeamSelect = (team) => {
    if (!VALID_TEAMS.includes(team)) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      team,
    }));

    setError("");
    setSuccess("");
  };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    // --------------------------------------------------------
    // NAME VALIDATION
    // --------------------------------------------------------

    if (!form.name.trim()) {
      setError("Employee name is required.");
      return;
    }

    // --------------------------------------------------------
    // TEAM VALIDATION
    // --------------------------------------------------------

    if (!form.team) {
      setError("Please select a team.");
      return;
    }

    // --------------------------------------------------------
    // VALID TEAM
    // --------------------------------------------------------

    if (!VALID_TEAMS.includes(form.team)) {
      setError("Please select a valid team.");
      return;
    }

    setSaving(true);

    try {
      // ======================================================
      // BUILD PAYLOAD
      // ======================================================

      const payload = {
        ...form,

        serial_no: form.serial_no
          ? Number(form.serial_no)
          : undefined,

        salary: form.salary
          ? Number(form.salary)
          : undefined,

        pf: form.pf
          ? Number(form.pf)
          : undefined,

        ctc: form.ctc
          ? Number(form.ctc)
          : undefined,
      };

      // ======================================================
      // REMOVE EMPTY VALUES
      // ======================================================

      Object.keys(payload).forEach((key) => {
        if (
          payload[key] === "" ||
          payload[key] === undefined ||
          payload[key] === null
        ) {
          delete payload[key];
        }
      });

      console.log("Adding employee:", payload);

      // ======================================================
      // API REQUEST
      // ======================================================

      const response = await fetch(
        `${API_URL}/employees`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        }
      );

      // ======================================================
      // RESPONSE
      // ======================================================

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      console.log(
        "Add employee response:",
        data
      );

      // ======================================================
      // API ERROR
      // ======================================================

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            "Failed to add employee."
        );
      }

      // ======================================================
      // GET CREATED EMPLOYEE ID
      // ======================================================

      const createdEmployeeId =
        data.employee_id ||
        data.id ||
        data.employee?.employee_id ||
        data.employee?.id ||
        "";

      // ======================================================
      // SUCCESS MESSAGE
      // ======================================================

      setSuccess(
        createdEmployeeId
          ? `Employee ${createdEmployeeId} added successfully.`
          : "Employee added successfully."
      );

      // ======================================================
      // KEEP SELECTED TEAM AFTER RESET
      // ======================================================

      const savedTeam = form.team;

      setForm({
        ...initialForm,
        team: savedTeam,
      });

      // ======================================================
      // GO TO PROFILE
      // ======================================================

      setTimeout(() => {
        if (createdEmployeeId) {
          navigate(
            `/employees/${encodeURIComponent(
              createdEmployeeId
            )}`
          );
        } else {
          navigate("/employees");
        }
      }, 1000);
    } catch (err) {
      console.error(
        "Add employee error:",
        err
      );

      setError(
        err.message ||
          "Unable to add employee. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // SELECTED TEAM DETAILS
  // ==========================================================

  const selectedTeam = teamOptions.find(
    (team) => team.value === form.team
  );

  // ==========================================================
  // CURRENT TEAM CLASS
  // ==========================================================

  const currentTeamClass =
    getTeamClass(form.team);

  // ==========================================================
  // FORM CLASS
  // ==========================================================

  const formClassName = [
    "employee-form",

    currentTeamClass
      ? `team-${currentTeamClass}`
      : "",

    form.team === "HR"
      ? "hr-form-active"
      : "",

    form.team === "Accounts"
      ? "accounts-form-active"
      : "",

    form.team === "Administration"
      ? "administration-form-active"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="app">

      {/* ====================================================
          SIDEBAR
      ==================================================== */}

      <Sidebar />

      {/* ====================================================
          MAIN
      ==================================================== */}

      <main className="main add-employee-page">

        {/* ==================================================
            PAGE HEADER
        ================================================== */}

        <div className="add-page-header">

          <div className="add-header-left">

            <div className="add-page-icon">
              <UserPlus size={23} />
            </div>

            <div>

              <div className="page-eyebrow">
                EMPLOYEE MANAGEMENT
              </div>

              <h1>
                Add Employee
              </h1>

              <p>
                Add a new employee to our organization
              </p>

            </div>

          </div>

          <button
            type="button"
            className="back-employees-btn"
            onClick={() =>
              navigate("/employees")
            }
          >
            <ArrowLeft size={17} />
            Back to Employees
          </button>

        </div>

        {/* ==================================================
            SUCCESS MESSAGE
        ================================================== */}

        {success && (
          <div className="form-message success-message">

            <CheckCircle size={19} />

            <span>
              {success}
            </span>

          </div>
        )}

        {/* ==================================================
            ERROR MESSAGE
        ================================================== */}

        {error && (
          <div className="form-message error-message">

            <AlertCircle size={19} />

            <span>
              {error}
            </span>

          </div>
        )}

        {/* ==================================================
            FORM
        ================================================== */}

        <form
          className={formClassName}
          onSubmit={handleSubmit}
        >

          {/* =================================================
              BASIC INFORMATION
          ================================================= */}

          <section className="form-section">

            <div className="section-heading">

              <h2>
                Basic Information
              </h2>

              <p>
                Employee identification and team information.
              </p>

            </div>

            <div className="form-grid">

              {/* EMPLOYEE ID */}

              <div className="form-field">

                <label htmlFor="employee_id">
                  Employee ID{" "}
                  <span className="optional">
                    (Leave blank to auto-generate)
                  </span>
                </label>

                <input
                  id="employee_id"
                  name="employee_id"
                  value={form.employee_id}
                  onChange={handleChange}
                  placeholder="Enter employee ID"
                />

                <small>
                  Example: EMP-10
                </small>

              </div>

              {/* SERIAL NUMBER */}

              <div className="form-field">

                <label htmlFor="serial_no">
                  Serial Number
                </label>

                <input
                  id="serial_no"
                  name="serial_no"
                  type="number"
                  min="0"
                  value={form.serial_no}
                  onChange={handleChange}
                  placeholder="Enter serial number"
                />

              </div>

              {/* NAME */}

              <div className="form-field">

                <label htmlFor="name">
                  Employee Name{" "}
                  <span>*</span>
                </label>

                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter employee name"
                  required
                />

              </div>

              {/* =================================================
                  TEAM
              ================================================= */}

              <div className="form-field team-selection-field">

                <label>
                  Team <span>*</span>
                </label>

                {/* TEAM CARDS */}

                <div className="team-selection-grid">

                  {teamOptions.map((team) => {

                    const TeamIcon =
                      team.icon;

                    const isSelected =
                      form.team ===
                      team.value;

                    const teamClass =
                      getTeamClass(
                        team.value
                      );

                    return (
                      <button
                        key={team.value}
                        type="button"
                        className={[
                          "team-select-card",

                          `team-select-${teamClass}`,

                          isSelected
                            ? "selected"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() =>
                          handleTeamSelect(
                            team.value
                          )
                        }
                        aria-pressed={
                          isSelected
                        }
                      >

                        <div className="team-select-icon">

                          <TeamIcon
                            size={23}
                            strokeWidth={1.8}
                          />

                        </div>

                        <div className="team-select-content">

                          <strong>
                            {team.label}
                          </strong>

                          <span>
                            {team.description}
                          </span>

                        </div>

                        {isSelected && (
                          <CheckCircle
                            size={19}
                            className="team-selected-check"
                          />
                        )}

                      </button>
                    );
                  })}

                </div>

                {/* HIDDEN SELECT FALLBACK */}

                <select
                  id="team"
                  name="team"
                  value={form.team}
                  onChange={handleChange}
                  className="team-hidden-select"
                  required
                  tabIndex={-1}
                  aria-hidden="true"
                >

                  <option value="">
                    Select team
                  </option>

                  {teamOptions.map(
                    (team) => (
                      <option
                        key={team.value}
                        value={team.value}
                      >
                        {team.label}
                      </option>
                    )
                  )}

                </select>

                {selectedTeam && (
                  <small className="selected-team-text">
                    Selected team:{" "}
                    <strong>
                      {selectedTeam.label}
                    </strong>
                  </small>
                )}

              </div>

              {/* DESIGNATION */}

              <div className="form-field">

                <label htmlFor="designation">
                  Designation
                </label>

                <input
                  id="designation"
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                  placeholder="Enter designation"
                />

              </div>

              {/* GRADE */}

              <div className="form-field">

                <label htmlFor="grade">
                  Grade
                </label>

                <input
                  id="grade"
                  name="grade"
                  value={form.grade}
                  onChange={handleChange}
                  placeholder="Enter grade"
                />

              </div>

              {/* PERFORMANCE */}

              <div className="form-field">

                <label htmlFor="performance">
                  Performance
                </label>

                <input
                  id="performance"
                  name="performance"
                  value={form.performance}
                  onChange={handleChange}
                  placeholder="Enter performance"
                />

              </div>

              {/* PROJECT */}

              <div className="form-field">

                <label htmlFor="project_name">
                  Project Name
                </label>

                <input
                  id="project_name"
                  name="project_name"
                  value={form.project_name}
                  onChange={handleChange}
                  placeholder="Enter project name"
                />

              </div>

              {/* DOJ */}

              <div className="form-field">

                <label htmlFor="doj">
                  Date of Joining
                </label>

                <input
                  id="doj"
                  name="doj"
                  type="date"
                  value={form.doj}
                  onChange={handleChange}
                />

              </div>

              {/* DOB */}

              <div className="form-field">

                <label htmlFor="dob">
                  Date of Birth
                </label>

                <input
                  id="dob"
                  name="dob"
                  type="date"
                  value={form.dob}
                  onChange={handleChange}
                />

              </div>

              {/* STATUS */}

              <div className="form-field">

                <label htmlFor="status">
                  Status
                </label>

                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >

                  <option value="Active">
                    Active
                  </option>

                  <option value="Exited">
                    Exited
                  </option>

                </select>

              </div>

            </div>

          </section>

          {/* =================================================
              PERSONAL INFORMATION
          ================================================= */}

          <section className="form-section">

            <div className="section-heading">

              <h2>
                Personal Information
              </h2>

              <p>
                Contact and personal details.
              </p>

            </div>

            <div className="form-grid">

              {/* CONTACT */}

              <div className="form-field">

                <label htmlFor="contact_number">
                  Contact Number
                </label>

                <input
                  id="contact_number"
                  name="contact_number"
                  value={form.contact_number}
                  onChange={handleChange}
                  placeholder="Enter contact number"
                  inputMode="tel"
                />

              </div>

              {/* EMAIL */}

              <div className="form-field">

                <label htmlFor="personal_email">
                  Personal Email
                </label>

                <input
                  id="personal_email"
                  name="personal_email"
                  type="email"
                  value={form.personal_email}
                  onChange={handleChange}
                  placeholder="Enter personal email"
                />

              </div>

              {/* QUALIFICATION */}

              <div className="form-field">

                <label htmlFor="qualification">
                  Qualification
                </label>

                <input
                  id="qualification"
                  name="qualification"
                  value={form.qualification}
                  onChange={handleChange}
                  placeholder="Enter qualification"
                />

              </div>

             

             

              {/* FATHER */}

              <div className="form-field">

                <label htmlFor="father_name">
                  Father's Name
                </label>

                <input
                  id="father_name"
                  name="father_name"
                  value={form.father_name}
                  onChange={handleChange}
                  placeholder="Enter father's name"
                />

              </div>

             

              
            
            </div>

          </section>

          

              {/* REMARKS */}

              <div className="form-field full-width">

                <label htmlFor="remarks">
                  Remarks
                </label>

                <textarea
                  id="remarks"
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  placeholder="Enter remarks"
                  rows={4}
                />

              </div>

            

          

          {/* =================================================
              FORM ACTIONS
          ================================================= */}

          <div className="form-actions">

            <button
              type="button"
              className="cancel-btn"
              onClick={() =>
                navigate("/employees")
              }
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="save-employee-btn"
              disabled={saving}
            >

              <Save size={18} />

              {saving
                ? "Saving..."
                : "Save Employee"}

            </button>

          </div>

        </form>

      </main>

    </div>
  );
}