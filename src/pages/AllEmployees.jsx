import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import { getEmployees } from "../services/api";

export default function AllEmployees() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [search, setSearch] = useState("");

  // Filters
  const [teamFilter, setTeamFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [designationFilter, setDesignationFilter] = useState("All");

  // Sorting
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    getEmployees()
      .then((data) => {
        setEmployees(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load employees:", error);
        setLoading(false);
      });
  }, []);

  // --------------------------------------------------
  // UNIQUE FILTER VALUES
  // --------------------------------------------------

  const teams = useMemo(() => {
    return [
      "All",
      ...new Set(
        employees
          .map((employee) => employee.team)
          .filter(Boolean)
      ),
    ];
  }, [employees]);

  const statuses = useMemo(() => {
    return [
      "All",
      ...new Set(
        employees
          .map((employee) => employee.status)
          .filter(Boolean)
      ),
    ];
  }, [employees]);

  const designations = useMemo(() => {
    return [
      "All",
      ...new Set(
        employees
          .map((employee) => employee.designation)
          .filter(Boolean)
      ),
    ];
  }, [employees]);

  // --------------------------------------------------
  // FILTER + SEARCH
  // --------------------------------------------------

  const filteredEmployees = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch =
        !searchText ||
        employee.name?.toLowerCase().includes(searchText) ||
        employee.employee_id
          ?.toLowerCase()
          .includes(searchText) ||
        employee.designation
          ?.toLowerCase()
          .includes(searchText) ||
        employee.project_name
          ?.toLowerCase()
          .includes(searchText) ||
        employee.team
          ?.toLowerCase()
          .includes(searchText);

      const matchesTeam =
        teamFilter === "All" ||
        employee.team === teamFilter;

      const matchesStatus =
        statusFilter === "All" ||
        employee.status === statusFilter;

      const matchesDesignation =
        designationFilter === "All" ||
        employee.designation === designationFilter;

      return (
        matchesSearch &&
        matchesTeam &&
        matchesStatus &&
        matchesDesignation
      );
    });
  }, [
    employees,
    search,
    teamFilter,
    statusFilter,
    designationFilter,
  ]);

  // --------------------------------------------------
  // SORT
  // --------------------------------------------------

  const sortedEmployees = useMemo(() => {
    const sorted = [...filteredEmployees];

    sorted.sort((a, b) => {
      let valueA = a[sortField] ?? "";
      let valueB = b[sortField] ?? "";

      valueA = String(valueA).toLowerCase();
      valueB = String(valueB).toLowerCase();

      if (valueA < valueB) {
        return sortDirection === "asc" ? -1 : 1;
      }

      if (valueA > valueB) {
        return sortDirection === "asc" ? 1 : -1;
      }

      return 0;
    });

    return sorted;
  }, [
    filteredEmployees,
    sortField,
    sortDirection,
  ]);

  // --------------------------------------------------
  // PAGINATION
  // --------------------------------------------------

  const totalPages = Math.max(
    1,
    Math.ceil(
      sortedEmployees.length / itemsPerPage
    )
  );

  const startIndex =
    (currentPage - 1) * itemsPerPage;

  const endIndex =
    startIndex + itemsPerPage;

  const currentEmployees =
    sortedEmployees.slice(
      startIndex,
      endIndex
    );

  // --------------------------------------------------
  // RESET PAGE WHEN FILTER CHANGES
  // --------------------------------------------------

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    teamFilter,
    statusFilter,
    designationFilter,
    itemsPerPage,
  ]);

  // --------------------------------------------------
  // SORT HANDLER
  // --------------------------------------------------

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(
        sortDirection === "asc"
          ? "desc"
          : "asc"
      );
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // --------------------------------------------------
  // CLEAR FILTERS
  // --------------------------------------------------

  const clearFilters = () => {
    setSearch("");
    setTeamFilter("All");
    setStatusFilter("All");
    setDesignationFilter("All");
    setSortField("name");
    setSortDirection("asc");
    setCurrentPage(1);
  };

  // --------------------------------------------------
  // SORT ICON
  // --------------------------------------------------

  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return <ArrowUpDown size={15} />;
    }

    return sortDirection === "asc"
      ? <ArrowUp size={15} />
      : <ArrowDown size={15} />;
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="app">
        <Sidebar />

        <main className="main">
          <div className="employees-loading">
            Loading employees...
          </div>
        </main>
      </div>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="app">

      <Sidebar />

      <main className="main">

        

        

        {/* HEADER */}

<div className="employees-page-header">
  <div>
    <div className="page-badge">
      <Users size={14} />
      Employee Directory
    </div>

    <h1>
      All Employees
    </h1>

    <p>
      Search, filter and manage
      our organization's employees.
    </p>
  </div>

  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
    }}
  >
    {/* DASHBOARD */}
    <button
      type="button"
      onClick={() => navigate("/")}
      style={{
        height: "44px",
        padding: "0 18px",
        border: "none",
        borderRadius: "8px",
        background: "#2563eb",
        color: "#fff",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
      }}
    >
      Dashboard
    </button>

    {/* ADD EMPLOYEE */}
    <button
      type="button"
      onClick={() => navigate("/employees/add")}
      style={{
        height: "44px",
        padding: "0 18px",
        border: "1px solid #2563eb",
        borderRadius: "8px",
        background: "#fff",
        color: "#2563eb",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
      }}
    >
      Add Employee
    </button>

    {/* IMPORT EXCEL */}
    <button
      type="button"
      onClick={() => navigate("/import")}
      style={{
        height: "44px",
        padding: "0 18px",
        border: "none",
        borderRadius: "8px",
        background: "#2563eb",
        color: "#fff",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
      }}
    >
      Import Excel
    </button>

    {/* MANAGE EMPLOYEES */}
    <button
      type="button"
      onClick={() => navigate("/employees")}
      style={{
        height: "44px",
        padding: "0 18px",
        border: "none",
        borderRadius: "8px",
        background: "#f97316",
        color: "#fff",
        fontSize: "14px",
        fontWeight: "700",
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(249, 115, 22, 0.30)",
      }}
    >
      🧡 Manage Employees
    </button>
  </div>
</div>


        {/* SEARCH + FILTER */}

        <div className="employee-filter-card">

          <div className="search-box">

            <Search size={19} />

            <input
              type="text"
              placeholder="Search by name, ID, team, designation or project..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

            {search && (
              <button
                className="clear-search"
                onClick={() => setSearch("")}
              >
                <X size={16} />
              </button>
            )}

          </div>


          <div className="filter-row">

            {/* TEAM */}

            <div className="filter-group">

              <label>
                Team
              </label>

              <select
                value={teamFilter}
                onChange={(e) =>
                  setTeamFilter(e.target.value)
                }
              >
                {teams.map((team) => (
                  <option
                    key={team}
                    value={team}
                  >
                    {team}
                  </option>
                ))}
              </select>

            </div>


            {/* STATUS */}

            <div className="filter-group">

              <label>
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
              >
                {statuses.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                ))}
              </select>

            </div>


            {/* DESIGNATION */}

            <div className="filter-group">

              <label>
                Designation
              </label>

              <select
                value={designationFilter}
                onChange={(e) =>
                  setDesignationFilter(e.target.value)
                }
              >
                {designations.map(
                  (designation) => (
                    <option
                      key={designation}
                      value={designation}
                    >
                      {designation}
                    </option>
                  )
                )}
              </select>

            </div>


            {/* CLEAR */}

            <button
              className="clear-filters-btn"
              onClick={clearFilters}
            >
              <Filter size={16} />
              Clear Filters
            </button>

          </div>

        </div>


        {/* RESULT SUMMARY */}

        <div className="employee-result-bar">

          <div>
            Showing{" "}
            <strong>
              {sortedEmployees.length === 0
                ? 0
                : startIndex + 1}
            </strong>
            {" - "}
            <strong>
              {Math.min(
                endIndex,
                sortedEmployees.length
              )}
            </strong>
            {" of "}
            <strong>
              {sortedEmployees.length}
            </strong>{" "}
            employees
          </div>

          <div className="items-per-page">

            <span>
              Show
            </span>

            <select
              value={itemsPerPage}
              onChange={(e) =>
                setItemsPerPage(
                  Number(e.target.value)
                )
              }
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>

            <span>
              per page
            </span>

          </div>

        </div>


        {/* TABLE */}

        <div className="employees-table-card">

          <div className="employees-table-wrapper">

            <table className="employees-table">

              <thead>

                <tr>

                  <th>
                    #
                  </th>

                  <th>
                    <button
                      className="sort-button"
                      onClick={() =>
                        handleSort("employee_id")
                      }
                    >
                      Employee ID
                      <SortIcon field="employee_id" />
                    </button>
                  </th>

                  <th>
                    <button
                      className="sort-button"
                      onClick={() =>
                        handleSort("name")
                      }
                    >
                      Employee
                      <SortIcon field="name" />
                    </button>
                  </th>

                  <th>
                    <button
                      className="sort-button"
                      onClick={() =>
                        handleSort("team")
                      }
                    >
                      Team
                      <SortIcon field="team" />
                    </button>
                  </th>

                  <th>
                    <button
                      className="sort-button"
                      onClick={() =>
                        handleSort("designation")
                      }
                    >
                      Designation
                      <SortIcon field="designation" />
                    </button>
                  </th>

                  <th>
                    Project
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Action
                  </th>

                </tr>

              </thead>


              <tbody>

                {currentEmployees.map(
                  (employee, index) => (

                    <tr
                      key={
                        employee.employee_id ||
                        employee.id
                      }
                      onClick={() =>
                        navigate(
                          `/employees/${encodeURIComponent(
                            employee.employee_id
                          )}`
                        )
                      }
                    >

                      <td>
                        {startIndex + index + 1}
                      </td>


                      <td>
                        <span className="employee-id">
                          {employee.employee_id}
                        </span>
                      </td>


                      <td>

                        <div className="employee-name-cell">

                          <div className="employee-avatar-small">
                            {employee.name
                              ?.charAt(0)
                              ?.toUpperCase()}
                          </div>

                          <strong>
                            {employee.name}
                          </strong>

                        </div>

                      </td>


                      <td>

                        <span
                          className={
                            employee.team
                              ?.toLowerCase()
                              .includes("ai")
                              ? "team-pill ai-pill"
                              : "team-pill networking-pill"
                          }
                        >
                          {employee.team}
                        </span>

                      </td>


                      <td>
                        {employee.designation || "—"}
                      </td>


                      <td>
                        {employee.project_name || "—"}
                      </td>


                      <td>

                        <span
                          className={
                            employee.status
                              ?.toLowerCase() ===
                            "active"
                              ? "status-pill active-pill"
                              : "status-pill exited-pill"
                          }
                        >
                          {employee.status}
                        </span>

                      </td>


                      <td>

                        <button
                          className="view-employee-btn"
                          onClick={(event) => {
                            event.stopPropagation();

                            navigate(
                              `/employees/${encodeURIComponent(
                                employee.employee_id
                              )}`
                            );
                          }}
                        >
                          View
                        </button>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>


            {/* EMPTY */}

            {currentEmployees.length === 0 && (

              <div className="employees-empty">

                <Users size={40} />

                <h3>
                  No employees found
                </h3>

                <p>
                  Try changing your search
                  or filters.
                </p>

                <button
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>

              </div>

            )}

          </div>


          {/* PAGINATION */}

          {sortedEmployees.length > 0 && (

            <div className="pagination">

              <button
                disabled={currentPage === 1}
                onClick={() =>
                  setCurrentPage(
                    currentPage - 1
                  )
                }
              >
                <ChevronLeft size={18} />
                Previous
              </button>


              <div className="page-numbers">

                {Array.from(
                  { length: totalPages },
                  (_, index) => index + 1
                )
                  .filter((page) => {

                    return (
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(
                        page - currentPage
                      ) <= 1
                    );

                  })
                  .map((page, index, pages) => {

                    const previousPage =
                      pages[index - 1];

                    const showDots =
                      previousPage &&
                      page - previousPage > 1;

                    return (
                      <span
                        key={page}
                        className="page-number-wrapper"
                      >

                        {showDots && (
                          <span className="page-dots">
                            ...
                          </span>
                        )}

                        <button
                          className={
                            currentPage === page
                              ? "page-number active"
                              : "page-number"
                          }
                          onClick={() =>
                            setCurrentPage(page)
                          }
                        >
                          {page}
                        </button>

                      </span>
                    );

                  })}

              </div>


              <button
                disabled={
                  currentPage === totalPages
                }
                onClick={() =>
                  setCurrentPage(
                    currentPage + 1
                  )
                }
              >
                Next
                <ChevronRight size={18} />
              </button>

            </div>

          )}

        </div>

      </main>

    </div>
  );
}