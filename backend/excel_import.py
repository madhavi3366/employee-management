import os
import pandas as pd

from models import Employee


# ============================================================
# COLUMN ALIASES
# ============================================================

COLUMN_ALIASES = {

    "serial_no": [
        "s no",
        "s.no",
        "sno",
        "serial no",
        "serial number"
    ],

    "employee_id": [
        "employee id",
        "emp id",
        "employee code",
        "emp code"
    ],

    "name": [
        "name",
        "emp name",
        "employee name",
        "employee"
    ],

    "grade": [
        "grade"
    ],

    "performance": [
        "performance",
        "performance rating"
    ],

    "doj": [
        "doj",
        "date of joining",
        "joining date"
    ],

    "salary": [
        "salary",
        "basic salary"
    ],

    "pf": [
        "pf"
    ],

    "ctc": [
        "ctc"
    ],

    "designation": [
        "designation",
        "job title",
        "role"
    ],

    "project_name": [
        "project name",
        "project"
    ],

    "team": [
        "team",
        "team name",
        "department"
    ],

    "network_team": [
        "network team",
        "networking team",
        "network",
        "networking"
    ],

    "ai_team": [
        "ai team",
        "ai",
        "artificial intelligence team",
        "artificial intelligence"
    ],

    "contact_number": [
        "contact",
        "contact number",
        "mobile",
        "mobile number",
        "phone",
        "phone number"
    ],

    "personal_email": [
        "email",
        "email id",
        "email address",
        "personal email",
        "personal email id"
    ],

    "name_as_per_aadhar": [
        "name as per aadhar",
        "name as per aadhaar"
    ],

    "aadhar_number": [
        "aadhar",
        "aadhar number",
        "aadhaar",
        "aadhaar number"
    ],

    "father_name": [
        "father name",
        "father's name"
    ],

    "dob": [
        "dob",
        "date of birth",
        "birth date"
    ],

    "pan_no": [
        "pan",
        "pan no",
        "pan number"
    ],

    "qualification": [
        "qualification",
        "education"
    ],

    "bank_account_no": [
        "bank account",
        "bank account no",
        "bank account number",
        "account number"
    ],

    "ifsc_code": [
        "ifsc",
        "ifsc code"
    ],

    "branch": [
        "branch",
        "bank branch"
    ],

    "pf_no": [
        "pf no",
        "pf number"
    ],

    "uan_no": [
        "uan",
        "uan no",
        "uan number"
    ],

    "remarks": [
        "remarks",
        "remark",
        "comments"
    ],

    "status": [
        "status",
        "employee status"
    ]
}


# ============================================================
# NORMALIZE COLUMN
# ============================================================

def normalize_column(value):

    value = str(value).strip().lower()

    value = (
        value
        .replace(".", "")
        .replace("_", " ")
        .replace("-", " ")
    )

    return " ".join(value.split())


# ============================================================
# FIND DATABASE FIELD
# ============================================================

def find_database_field(column):

    normalized = normalize_column(column)

    for database_field, aliases in COLUMN_ALIASES.items():

        for alias in aliases:

            if normalized == normalize_column(alias):

                return database_field

    return None


# ============================================================
# CLEAN VALUE
# ============================================================

def clean_value(value):

    if pd.isna(value):
        return None

    value = str(value).strip()

    if value == "":
        return None

    return value


# ============================================================
# CLEAN NUMBER
# ============================================================

def clean_number(value):

    value = clean_value(value)

    if value is None:
        return None

    try:

        return float(value)

    except (
        ValueError,
        TypeError
    ):

        return None


# ============================================================
# GENERATE EMPLOYEE ID
# ============================================================

def generate_employee_id(
    db,
    reserved_ids=None
):

    existing_ids = set(
        employee.employee_id
        for employee in db.query(Employee).all()
        if employee.employee_id
    )

    if reserved_ids:

        existing_ids.update(
            reserved_ids
        )

    number = 1

    while True:

        candidate = f"EMP-{number}"

        if candidate not in existing_ids:

            return candidate

        number += 1


# ============================================================
# FIND EXISTING EMPLOYEE
# ============================================================

def find_existing_employee(
    db,
    employee_id,
    employee_name,
    employee_email
):

    if employee_id:

        employee = (
            db.query(Employee)
            .filter(
                Employee.employee_id
                == employee_id
            )
            .first()
        )

        if employee:

            return employee


    if employee_email:

        employee = (
            db.query(Employee)
            .filter(
                Employee.personal_email
                == employee_email
            )
            .first()
        )

        if employee:

            return employee


    if employee_name:

        employee = (
            db.query(Employee)
            .filter(
                Employee.name
                == employee_name
            )
            .first()
        )

        if employee:

            return employee


    return None


# ============================================================
# NORMALIZE TEAM VALUE
# ============================================================

def normalize_team_value(value):

    if value is None:

        return None

    value = str(value).strip().lower()

    # --------------------------------------------------------
    # NETWORKING
    # --------------------------------------------------------

    if value in [
        "network",
        "networking",
        "network team",
        "networking team",
        "networking department",
        "network department"
    ]:

        return "Networking"


    # --------------------------------------------------------
    # AI
    # --------------------------------------------------------

    if value in [
        "ai",
        "ai team",
        "artificial intelligence",
        "artificial intelligence team",
        "ai department",
        "artificial intelligence department"
    ]:

        return "AI"


    return None


# ============================================================
# IS POSITIVE TEAM VALUE
#
# Handles values such as:
#
# AI
# Yes
# Y
# True
# 1
# Networking
# etc.
# ============================================================

def is_positive_team_value(value):

    if value is None:

        return False

    value = str(value).strip().lower()

    return value in [
        "yes",
        "y",
        "true",
        "1",
        "ai",
        "network",
        "networking",
        "team",
        "active"
    ]


# ============================================================
# DETERMINE TEAM FROM ROW
# ============================================================

def determine_team(
    row,
    column_mapping
):

    # --------------------------------------------------------
    # FIRST:
    # Normal Team column
    # --------------------------------------------------------

    for column, field in column_mapping.items():

        if field == "team":

            value = clean_value(
                row[column]
            )

            if value:

                normalized_team = (
                    normalize_team_value(
                        value
                    )
                )

                if normalized_team:

                    return normalized_team

                # If the team value is something else,
                # preserve it.
                return value


    # --------------------------------------------------------
    # SECOND:
    # Network Team column
    # --------------------------------------------------------

    for column, field in column_mapping.items():

        if field == "network_team":

            value = clean_value(
                row[column]
            )

            if value and is_positive_team_value(
                value
            ):

                return "Networking"


    # --------------------------------------------------------
    # THIRD:
    # AI Team column
    # --------------------------------------------------------

    for column, field in column_mapping.items():

        if field == "ai_team":

            value = clean_value(
                row[column]
            )

            if value:

                # Values such as:
                #
                # AI
                # Yes
                # Y
                # True
                # 1
                #
                # mean the employee belongs to AI.

                if is_positive_team_value(
                    value
                ):

                    return "AI"


    return None


# ============================================================
# DETERMINE TEAM FROM FILE NAME
#
# This is the important fix for your situation.
#
# Example:
#
# AI Team.xlsx
# AI Employees.xlsx
# Artificial Intelligence.xlsx
#
# will automatically become AI.
# ============================================================

def determine_team_from_filename(
    file_path
):

    filename = os.path.basename(
        file_path
    ).lower()

    filename_without_extension = (
        os.path.splitext(filename)[0]
    )

    normalized_filename = (
        filename_without_extension
        .replace("_", " ")
        .replace("-", " ")
        .replace(".", " ")
    )

    normalized_filename = (
        " ".join(
            normalized_filename.split()
        )
    )


    # --------------------------------------------------------
    # AI
    # --------------------------------------------------------

    ai_keywords = [
        "ai",
        "ai team",
        "ai employee",
        "ai employees",
        "artificial intelligence",
        "artificial intelligence team",
        "artificial intelligence employees"
    ]

    for keyword in ai_keywords:

        if keyword in normalized_filename:

            return "AI"


    # --------------------------------------------------------
    # NETWORKING
    # --------------------------------------------------------

    networking_keywords = [
        "network",
        "networking",
        "network team",
        "networking team",
        "network employees",
        "networking employees"
    ]

    for keyword in networking_keywords:

        if keyword in normalized_filename:

            return "Networking"


    return None


# ============================================================
# IMPORT EXCEL
# ============================================================

def import_excel(
    file_path,
    db,
    import_id=None
):

    # ========================================================
    # READ EXCEL
    # ========================================================

    try:

        df = pd.read_excel(
            file_path
        )

    except Exception as error:

        raise ValueError(
            f"Unable to read Excel file: {error}"
        )


    if df.empty:

        raise ValueError(
            "The Excel file is empty."
        )


    # ========================================================
    # MAP COLUMNS
    # ========================================================

    column_mapping = {}

    for column in df.columns:

        database_field = (
            find_database_field(
                column
            )
        )

        if database_field:

            column_mapping[
                column
            ] = database_field


    # ========================================================
    # FIND NAME COLUMN
    # ========================================================

    name_column = None

    for column, field in column_mapping.items():

        if field == "name":

            name_column = column

            break


    if name_column is None:

        raise ValueError(
            "Employee name column was not found. "
            "Use Name, EMP NAME or Employee Name."
        )


    # ========================================================
    # DETERMINE FILE-LEVEL TEAM
    # ========================================================

    file_team = (
        determine_team_from_filename(
            file_path
        )
    )


    # ========================================================
    # COUNTERS
    # ========================================================

    imported = 0

    updated = 0

    skipped = 0

    reserved_ids = set()


    # ========================================================
    # PROCESS ROWS
    # ========================================================

    for _, row in df.iterrows():

        employee_name = clean_value(
            row[name_column]
        )


        if not employee_name:

            skipped += 1

            continue


        # ====================================================
        # EMPLOYEE ID
        # ====================================================

        employee_id = None

        for column, field in column_mapping.items():

            if field == "employee_id":

                employee_id = clean_value(
                    row[column]
                )

                break


        # ====================================================
        # EMAIL
        # ====================================================

        employee_email = None

        for column, field in column_mapping.items():

            if field == "personal_email":

                employee_email = clean_value(
                    row[column]
                )

                break


        # ====================================================
        # FIND EXISTING EMPLOYEE
        # ====================================================

        employee = find_existing_employee(
            db,
            employee_id,
            employee_name,
            employee_email
        )


        # ====================================================
        # CREATE EMPLOYEE
        # ====================================================

        if employee is None:

            if not employee_id:

                employee_id = (
                    generate_employee_id(
                        db,
                        reserved_ids
                    )
                )


            employee = Employee(
                employee_id=employee_id
            )

            db.add(employee)

            imported += 1

            reserved_ids.add(
                employee_id
            )


        else:

            updated += 1


        # ====================================================
        # ASSOCIATE IMPORT
        # ====================================================

        if import_id is not None:

            employee.import_id = import_id


        # ====================================================
        # STORE FIELDS
        # ====================================================

        for column, database_field in (
            column_mapping.items()
        ):

            # ------------------------------------------------
            # Helper columns are not database fields
            # ------------------------------------------------

            if database_field in [
                "network_team",
                "ai_team"
            ]:

                continue


            value = row[column]


            # ------------------------------------------------
            # NUMERIC FIELDS
            # ------------------------------------------------

            if database_field in [
                "salary",
                "pf",
                "ctc"
            ]:

                value = clean_number(
                    value
                )


            else:

                value = clean_value(
                    value
                )


            # ------------------------------------------------
            # SERIAL NUMBER
            # ------------------------------------------------

            if database_field == "serial_no":

                if value is not None:

                    try:

                        value = int(
                            float(value)
                        )

                    except (
                        ValueError,
                        TypeError
                    ):

                        value = None


            # ------------------------------------------------
            # NEVER OVERWRITE EXISTING DATA WITH BLANK
            # ------------------------------------------------

            if value is not None:

                setattr(
                    employee,
                    database_field,
                    value
                )


        # ====================================================
        # DETERMINE TEAM FROM ROW
        # ====================================================

        detected_team = determine_team(
            row,
            column_mapping
        )


        # ====================================================
        # TEAM PRIORITY
        #
        # 1. Explicit Team column
        # 2. AI Team / Network Team column
        # 3. File name
        # ====================================================

        final_team = (
            detected_team
            or file_team
        )


        if final_team:

            employee.team = final_team


        # ====================================================
        # NETWORK TEAM VALUE → GRADE
        # ====================================================

        for column, field in (
            column_mapping.items()
        ):

            if field == "network_team":

                network_level = clean_value(
                    row[column]
                )

                if network_level:

                    # Do not use "Yes", "Y", "True", etc.
                    # as a grade.

                    if network_level.lower() not in [
                        "yes",
                        "y",
                        "true",
                        "1",
                        "network",
                        "networking"
                    ]:

                        employee.grade = (
                            network_level
                        )

                break


        # ====================================================
        # DEFAULT STATUS
        # ====================================================

        if not employee.status:

            employee.status = "Active"


    # ========================================================
    # COMMIT
    # ========================================================

    try:

        db.commit()

    except Exception as error:

        db.rollback()

        raise error


    # ========================================================
    # UNRECOGNIZED COLUMNS
    # ========================================================

    unrecognized_columns = [

        column

        for column in df.columns

        if column not in column_mapping
    ]


    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "rows_found":
            len(df),

        "imported":
            imported,

        "updated":
            updated,

        "skipped":
            skipped,

        "detected_file_team":
            file_team,

        "recognized_columns":
            list(
                column_mapping.values()
            ),

        "unrecognized_columns":
            unrecognized_columns
    }