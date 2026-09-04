import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";

import {
  getEmployee,
  updateEmployee,
} from "../services/api";

import "../index.css";

export default function EmployeeProfile() {
  const { employeeId } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [formData, setFormData] = useState({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ============================================================
  // LOAD EMPLOYEE
  // ============================================================

  useEffect(() => {
    loadEmployee();
  }, [employeeId]);

  const loadEmployee = async () => {
    try {
      setError("");

      const data = await getEmployee(employeeId);

      const employeeData = {
        ...data,

        // Existing employees default to Salary
        pay_type: data.pay_type || "Salary",

        // Make sure stipend exists in form data
        stipend:
          data.stipend !== undefined &&
          data.stipend !== null
            ? data.stipend
            : "",
      };

      setEmployee(employeeData);
      setFormData(employeeData);
    } catch (error) {
      console.error(
        "Failed to load employee:",
        error
      );

      setError(
        error.message ||
          "Failed to load employee."
      );
    }
  };

  // ============================================================
  // HANDLE INPUT CHANGE
  // ============================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
    setError("");
  };

  // ============================================================
  // HANDLE PAY TYPE CHANGE
  // ============================================================

  const handlePayTypeChange = (event) => {
    const payType = event.target.value;

    setFormData((previous) => ({
      ...previous,
      pay_type: payType,
    }));

    setMessage("");
    setError("");
  };

  // ============================================================
  // START EDITING
  // ============================================================

  const handleEdit = () => {
    setMessage("");
    setError("");

    setFormData({
      ...employee,
      pay_type: employee.pay_type || "Salary",
      stipend:
        employee.stipend !== undefined &&
        employee.stipend !== null
          ? employee.stipend
          : "",
    });

    setEditing(true);
  };

  // ============================================================
  // CANCEL EDITING
  // ============================================================

  const handleCancel = () => {
    setFormData({
      ...employee,
      pay_type: employee.pay_type || "Salary",
      stipend:
        employee.stipend !== undefined &&
        employee.stipend !== null
          ? employee.stipend
          : "",
    });

    setMessage("");
    setError("");

    setEditing(false);
  };

  // ============================================================
  // SAVE EMPLOYEE
  // ============================================================

  const handleSave = async () => {
    try {
      setSaving(true);

      setMessage("");
      setError("");

      const oldEmployeeId =
        employee.employee_id;

      const newEmployeeId =
        formData.employee_id?.trim();

      if (!newEmployeeId) {
        setError(
          "Employee ID cannot be empty."
        );

        setSaving(false);
        return;
      }

      if (!formData.name?.trim()) {
        setError(
          "Employee name cannot be empty."
        );

        setSaving(false);
        return;
      }

      if (!formData.team) {
        setError(
          "Please select a team."
        );

        setSaving(false);
        return;
      }

      // --------------------------------------------------------
      // PAY TYPE VALIDATION
      // --------------------------------------------------------

      if (
        formData.pay_type !== "Salary" &&
        formData.pay_type !== "Stipend"
      ) {
        setError(
          "Please select Salary or Stipend."
        );

        setSaving(false);
        return;
      }

      // --------------------------------------------------------
      // PREPARE DATA
      // --------------------------------------------------------

      const dataToSave = {
        ...formData,

        employee_id: newEmployeeId,

        pay_type:
          formData.pay_type || "Salary",

        gender:
          formData.gender || "",
      };

      // --------------------------------------------------------
      // SAVE
      // --------------------------------------------------------

      const updatedEmployee =
        await updateEmployee(
          oldEmployeeId,
          dataToSave
        );

      const savedEmployee =
        updatedEmployee.employee ||
        updatedEmployee;

      const finalEmployee = {
        ...savedEmployee,

        pay_type:
          savedEmployee.pay_type ||
          formData.pay_type ||
          "Salary",

        stipend:
          savedEmployee.stipend ??
          formData.stipend ??
          "",
      };

      setEmployee(finalEmployee);
      setFormData(finalEmployee);
      setEditing(false);

      setMessage(
        "Employee updated successfully!"
      );

      // --------------------------------------------------------
      // UPDATE URL IF EMPLOYEE ID CHANGED
      // --------------------------------------------------------

      if (
        oldEmployeeId !==
        finalEmployee.employee_id
      ) {
        navigate(
          `/employees/${encodeURIComponent(
            finalEmployee.employee_id
          )}`,
          {
            replace: true,
          }
        );
      }
    } catch (error) {
      console.error(
        "Failed to update employee:",
        error
      );

      setError(
        error.message ||
          "Failed to update employee."
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (!employee && !error) {
    return (
      <div className="app">
        <Sidebar />

        <main className="main">
          <div className="loading-state">
            Loading employee...
          </div>
        </main>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error && !employee) {
    return (
      <div className="app">
        <Sidebar />

        <main className="main">
          <div className="error-state">
            <h2>
              Unable to load employee
            </h2>

            <p>{error}</p>

            <button
              onClick={() =>
                navigate("/employees")
              }
            >
              Back to Employees
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="app">
      <Sidebar />

      <main className="main">

        {/* ==================================================
            TOP ACTION BAR
        ================================================== */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: "10px 16px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              background: "white",
              cursor: "pointer",
            }}
          >
            ← Back
          </button>

          {!editing ? (
            <button
              type="button"
              onClick={handleEdit}
              style={{
                padding: "11px 22px",
                border: "none",
                borderRadius: "8px",
                background: "#2563eb",
                color: "white",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Edit Employee
            </button>
          ) : (
            <div
              style={{
                display: "flex",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                style={{
                  padding: "11px 20px",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "11px 22px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#16a34a",
                  color: "white",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          )}
        </div>

        {/* ==================================================
            SUCCESS MESSAGE
        ================================================== */}

        {message && (
          <div
            style={{
              padding: "12px 16px",
              marginBottom: "20px",
              borderRadius: "8px",
              background: "#dcfce7",
              color: "#166534",
              fontWeight: "500",
            }}
          >
            {message}
          </div>
        )}

        {/* ==================================================
            ERROR MESSAGE
        ================================================== */}

        {error && (
          <div
            style={{
              padding: "12px 16px",
              marginBottom: "20px",
              borderRadius: "8px",
              background: "#fee2e2",
              color: "#991b1b",
              fontWeight: "500",
            }}
          >
            {error}
          </div>
        )}

        {/* ==================================================
            PROFILE HEADER
        ================================================== */}

        <div className="profile-header">
          <div className="avatar">
            {employee.name
              ?.charAt(0)
              ?.toUpperCase() || "?"}
          </div>

          <div>
            <h1>
              {employee.name}
            </h1>

            <p>
              {employee.employee_id}
              {" · "}
              {employee.designation ||
                "Employee"}
              {" · "}
              {employee.team ||
                "No Team"}
            </p>
          </div>
        </div>

        {/* ==================================================
            PERSONAL INFORMATION
        ================================================== */}

        <section className="profile-section">
          <h2>
            Personal Information
          </h2>

          <div className="details-grid">

            <EditableField
              label="Name"
              name="name"
              value={formData.name}
              editing={editing}
              onChange={handleChange}
            />

            <EditableSelect
              label="Gender"
              name="gender"
              value={formData.gender}
              editing={editing}
              onChange={handleChange}
              options={[
                "Male",
                "Female",
                "Other",
              ]}
            />

            <EditableField
              label="Date of Birth"
              name="dob"
              value={formData.dob}
              editing={editing}
              onChange={handleChange}
              type="date"
            />

            <EditableField
              label="Father Name"
              name="father_name"
              value={formData.father_name}
              editing={editing}
              onChange={handleChange}
            />   

            <EditableField
              label="Contact Number"
              name="contact_number"
              value={formData.contact_number}
              editing={editing}
              onChange={handleChange}
            />

            <EditableField
              label="Personal Email"
              name="personal_email"
              value={formData.personal_email}
              editing={editing}
              onChange={handleChange}
              type="email"
            />

            <EditableField
              label="Qualification"
              name="qualification"
              value={formData.qualification}
              editing={editing}
              onChange={handleChange}
            />

          </div>
        </section>

        {/* ==================================================
            EMPLOYMENT INFORMATION
        ================================================== */}

        <section className="profile-section">
          <h2>
            Employment Information
          </h2>

          <div className="details-grid">

            <EditableField
              label="Employee ID"
              name="employee_id"
              value={formData.employee_id}
              editing={editing}
              onChange={handleChange}
            />

            <EditableField
              label="Date of Joining"
              name="doj"
              value={formData.doj}
              editing={editing}
              onChange={handleChange}
              type="date"
            />

            <EditableField
              label="Designation"
              name="designation"
              value={formData.designation}
              editing={editing}
              onChange={handleChange}
            />

            <EditableField
              label="Project"
              name="project_name"
              value={formData.project_name}
              editing={editing}
              onChange={handleChange}
            />

            {/* ==================================================
                TEAM
            ================================================== */}

            <EditableSelect
              label="Team"
              name="team"
              value={formData.team}
              editing={editing}
              onChange={handleChange}
              options={[
                "Networking",
                "AI",
                "HR",
                "Accounts",
                "Administration",
              ]}
            />

            <EditableField
              label="Grade"
              name="grade"
              value={formData.grade}
              editing={editing}
              onChange={handleChange}
            />

            <EditableField
              label="Performance"
              name="performance"
              value={formData.performance}
              editing={editing}
              onChange={handleChange}
            />

            {/* ==================================================
                STATUS
            ================================================== */}

            <EditableSelect
              label="Status"
              name="status"
              value={formData.status}
              editing={editing}
              onChange={handleChange}
              options={[
                "Active",
                "Exited",
              ]}
            />

            <EditableField
              label="Remarks"
              name="remarks"
              value={formData.remarks}
              editing={editing}
              onChange={handleChange}
            />

          </div>
        </section>


      </main>
    </div>
  );
}


// ============================================================
// EDITABLE FIELD
// ============================================================

function EditableField({
  label,
  name,
  value,
  editing,
  onChange,
  type = "text",
}) {
  return (
    <div className="detail-item">

      <span>
        {label}
      </span>

      {editing ? (

        <input
          type={type}
          name={name}
          value={value ?? ""}
          onChange={onChange}
          style={{
            width: "100%",
            padding: "10px 12px",
            marginTop: "6px",
            border:
              "1px solid #d1d5db",
            borderRadius: "7px",
            fontSize: "15px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />

      ) : (

        <strong>
          {value !== undefined &&
          value !== null &&
          value !== ""
            ? value
            : "—"}
        </strong>

      )}

    </div>
  );
}


// ============================================================
// EDITABLE SELECT
// ============================================================

function EditableSelect({
  label,
  name,
  value,
  editing,
  onChange,
  options,
}) {
  return (
    <div className="detail-item">

      <span>
        {label}
      </span>

      {editing ? (

        <select
          name={name}
          value={value ?? ""}
          onChange={onChange}
          style={{
            width: "100%",
            padding: "10px 12px",
            marginTop: "6px",
            border:
              "1px solid #d1d5db",
            borderRadius: "7px",
            fontSize: "15px",
            background: "white",
            boxSizing: "border-box",
          }}
        >

          <option value="">
            Select {label}
          </option>

          {options.map(
            (option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            )
          )}

        </select>

      ) : (

        <strong>
          {value || "—"}
        </strong>

      )}

    </div>
  );
}