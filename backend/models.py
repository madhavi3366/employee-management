from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    ForeignKey,
    DateTime,
)

from sqlalchemy.orm import relationship

from database import Base
from datetime import datetime

class ExpenseFile(Base):
    __tablename__ = "expense_files"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    year = Column(
        Integer,
        nullable=False,
        index=True
    )

    month = Column(
        String,
        nullable=False,
        index=True
    )

    original_filename = Column(
        String,
        nullable=False
    )

    stored_filename = Column(
        String,
        nullable=False,
        unique=True
    )

    file_type = Column(
        String,
        nullable=True
    )

    file_size = Column(
        Integer,
        default=0
    )

    uploaded_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    status = Column(
        String,
        default="Available"
    )


# ============================================================
# IMPORT HISTORY
# ============================================================

class ImportHistory(Base):

    __tablename__ = "import_history"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    filename = Column(
        String,
        nullable=False
    )

    imported_at = Column(
        String,
        nullable=False
    )

    records = Column(
        Integer,
        default=0
    )

    status = Column(
        String,
        default="Completed"
    )

    # --------------------------------------------------------
    # ORIGINAL EXCEL WORKBOOK
    # --------------------------------------------------------

    file_id = Column(
        String,
        nullable=True,
        index=True
    )

    stored_filename = Column(
        String,
        nullable=True
    )

    file_size = Column(
        Integer,
        default=0
    )

    # --------------------------------------------------------
    # EMPLOYEES
    # --------------------------------------------------------

    employees = relationship(
        "Employee",
        back_populates="import_history",
        cascade="all, delete-orphan"
    )


# ============================================================
# EMPLOYEE
# ============================================================

class Employee(Base):

    __tablename__ = "employees"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # --------------------------------------------------------
    # BASIC EMPLOYEE INFORMATION
    # --------------------------------------------------------

    employee_id = Column(
        String,
        unique=True,
        index=True,
        nullable=False
    )

    serial_no = Column(
        Integer,
        nullable=True
    )

    name = Column(
        String,
        nullable=False
    )

    team = Column(
        String,
        nullable=True
    )

    designation = Column(
        String,
        nullable=True
    )

    project_name = Column(
        String,
        nullable=True
    )

    doj = Column(
        String,
        nullable=True
    )

    dob = Column(
        String,
        nullable=True
    )

    grade = Column(
        String,
        nullable=True
    )

    performance = Column(
        String,
        nullable=True
    )

    qualification = Column(
        String,
        nullable=True
    )

    gender = Column(
        String,
        nullable=True
    )

    # --------------------------------------------------------
    # CONTACT INFORMATION
    # --------------------------------------------------------

    contact_number = Column(
        String,
        nullable=True
    )

    personal_email = Column(
        String,
        nullable=True
    )

    # --------------------------------------------------------
    # IDENTITY INFORMATION
    # --------------------------------------------------------

    name_as_per_aadhar = Column(
        String,
        nullable=True
    )

    aadhar_number = Column(
        String,
        nullable=True
    )

    father_name = Column(
        String,
        nullable=True
    )

    pan_no = Column(
        String,
        nullable=True
    )

    # --------------------------------------------------------
    # PAYROLL DETAILS
    # --------------------------------------------------------

    payroll_type = Column(
        String,
        default="Salary",
        nullable=True
    )

    salary = Column(
        Float,
        nullable=True
    )

    stipend = Column(
        Float,
        nullable=True
    )

    pf = Column(
        Float,
        nullable=True
    )

    ctc = Column(
        Float,
        nullable=True
    )

    # --------------------------------------------------------
    # BANK DETAILS
    # --------------------------------------------------------

    pf_no = Column(
        String,
        nullable=True
    )

    uan_no = Column(
        String,
        nullable=True
    )

    bank_account_no = Column(
        String,
        nullable=True
    )

    ifsc_code = Column(
        String,
        nullable=True
    )

    branch = Column(
        String,
        nullable=True
    )

    # --------------------------------------------------------
    # OTHER
    # --------------------------------------------------------

    remarks = Column(
        String,
        nullable=True
    )

    status = Column(
        String,
        default="Active",
        nullable=True
    )

    # --------------------------------------------------------
    # IMPORT HISTORY
    # --------------------------------------------------------

    import_id = Column(
        Integer,
        ForeignKey(
            "import_history.id"
        ),
        nullable=True
    )

    import_history = relationship(
        "ImportHistory",
        back_populates="employees"
    )