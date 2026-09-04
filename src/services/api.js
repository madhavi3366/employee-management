const API_URL = "http://127.0.0.1:8000";

// ============================================================
// GET ALL EMPLOYEES
// ============================================================

export async function getEmployees() {
  const response = await fetch(`${API_URL}/employees`);

  if (!response.ok) {
    throw new Error("Failed to fetch employees");
  }

  return response.json();
}


// ============================================================
// GET SINGLE EMPLOYEE
// ============================================================

export async function getEmployee(employeeId) {
  const response = await fetch(
    `${API_URL}/employees/${encodeURIComponent(employeeId)}`
  );

  if (!response.ok) {
    throw new Error("Employee not found");
  }

  return response.json();
}


// ============================================================
// GET TEAMS
// ============================================================

export async function getTeams() {
  const response = await fetch(`${API_URL}/teams`);

  if (!response.ok) {
    throw new Error("Failed to fetch teams");
  }

  return response.json();
}


// ============================================================
// GET TEAM EMPLOYEES
// ============================================================

export async function getTeamEmployees(teamName) {
  const response = await fetch(
    `${API_URL}/teams/${encodeURIComponent(teamName)}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch team employees");
  }

  return response.json();
}


// ============================================================
// ADD NEW EMPLOYEE
// ============================================================

export async function addEmployee(employeeData) {
  const response = await fetch(
    `${API_URL}/employees`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(employeeData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
      "Failed to add employee"
    );
  }

  return data;
}


// ============================================================
// UPDATE COMPLETE EMPLOYEE
// ============================================================

export async function updateEmployee(
  employeeId,
  employeeData
) {
  const response = await fetch(
    `${API_URL}/employees/${encodeURIComponent(employeeId)}`,
    {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(employeeData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
      "Failed to update employee"
    );
  }

  return data;
}


// ============================================================
// UPDATE EMPLOYEE TEAM
// ============================================================

export async function updateEmployeeTeam(
  employeeId,
  team
) {
  const response = await fetch(
    `${API_URL}/employees/${encodeURIComponent(employeeId)}`,
    {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        team: team,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
      "Failed to update employee team"
    );
  }

  // Backend returns { message, employee }
  return data.employee || data;
}