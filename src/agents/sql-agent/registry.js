
export const schemaRegistry = {
    "customers": {
        "table": "customers",
        "description": "Stores information about loan customers",
        "columns": [
            {
                "name": "id",
                "type": "INTEGER",
                "description": "Primary key of the customer"
            },
            {
                "name": "full_name",
                "type": "TEXT",
                "description": "Full name of the customer"
            },
            {
                "name": "email",
                "type": "TEXT",
                "description": "Customer email address"
            },
            {
                "name": "phone",
                "type": "TEXT",
                "description": "Customer phone number"
            },
            {
                "name": "date_of_birth",
                "type": "DATE",
                "description": "Customer date of birth"
            },
            {
                "name": "created_at",
                "type": "TIMESTAMP",
                "description": "Customer record creation timestamp"
            }
        ]
    },
    "loan_products": {
        "table": "loan_products",
        "description": "Stores loan product definitions",
        "columns": [
            {
                "name": "id",
                "type": "INTEGER",
                "description": "Primary key of the loan product"
            },
            {
                "name": "name",
                "type": "TEXT",
                "description": "Name of the loan product"
            },
            {
                "name": "interest_rate",
                "type": "DECIMAL",
                "description": "Interest rate for this loan product"
            },
            {
                "name": "term_months",
                "type": "INTEGER",
                "description": "Loan duration in months"
            },
            {
                "name": "created_at",
                "type": "TIMESTAMP",
                "description": "Record creation timestamp"
            }
        ]
    },
    "loans": {
        "table": "loans",
        "description": "Stores loan applications and disbursements",
        "columns": [
            {
                "name": "id",
                "type": "INTEGER",
                "description": "Primary key of the loan"
            },
            {
                "name": "customer_id",
                "type": "INTEGER",
                "description": "Customer who took the loan"
            },
            {
                "name": "loan_product_id",
                "type": "INTEGER",
                "description": "Type of loan"
            },
            {
                "name": "principal_amount",
                "type": "DECIMAL",
                "description": "Loan principal amount"
            },
            {
                "name": "interest_rate",
                "type": "DECIMAL",
                "description": "Loan interest rate"
            },
            {
                "name": "start_date",
                "type": "DATE",
                "description": "Loan start date"
            },
            {
                "name": "due_date",
                "type": "DATE",
                "description": "Loan due date"
            },
            {
                "name": "status",
                "type": "TEXT",
                "description": "Loan status (pending, active, closed)"
            },
            {
                "name": "created_at",
                "type": "TIMESTAMP",
                "description": "Loan record creation timestamp"
            }
        ],
        "relations": [
            {
                "column": "customer_id",
                "references": "customers.id",
                "description": "Customer who owns the loan"
            },
            {
                "column": "loan_product_id",
                "references": "loan_products.id",
                "description": "Type of loan product"
            }
        ]
    },
    "payments": {
        "table": "payments",
        "description": "Tracks loan repayments",
        "columns": [
            {
                "name": "id",
                "type": "INTEGER",
                "description": "Primary key of the payment"
            },
            {
                "name": "loan_id",
                "type": "INTEGER",
                "description": "Loan associated with the payment"
            },
            {
                "name": "amount",
                "type": "DECIMAL",
                "description": "Payment amount"
            },
            {
                "name": "payment_date",
                "type": "DATE",
                "description": "Date of payment"
            },
            {
                "name": "created_at",
                "type": "TIMESTAMP",
                "description": "Payment record creation timestamp"
            }
        ],
        "relations": [
            {
                "column": "loan_id",
                "references": "loans.id",
                "description": "Loan being repaid"
            }
        ]
    }
};
export const sqlRegistry = {
    "getCustomerByEmail": {
        "query": "SELECT * FROM customers WHERE email = :email",
        "description": "Fetch customer by email",
        "params": [
            "email"
        ]
    },
    "getCustomerById": {
        "query": "SELECT * FROM customers WHERE id = :id",
        "description": "Fetch customer by ID",
        "params": [
            "id"
        ]
    },
    "listAllCustomers": {
        "query": "SELECT * FROM customers",
        "description": "List all customers",
        "params": []
    },
    "getLoanProductById": {
        "query": "SELECT * FROM loan_products WHERE id = :id",
        "description": "Fetch loan product by ID",
        "params": [
            "id"
        ]
    },
    "listLoanProducts": {
        "query": "SELECT * FROM loan_products",
        "description": "List all loan products",
        "params": []
    },
    "getLoanById": {
        "query": "SELECT * FROM loans WHERE id = :id",
        "description": "Fetch loan by ID",
        "params": [
            "id"
        ]
    },
    "listLoansByCustomer": {
        "query": "SELECT * FROM loans WHERE customer_id = :customer_id",
        "description": "List all loans for a specific customer",
        "params": [
            "customer_id"
        ]
    },
    "listActiveLoans": {
        "query": "SELECT * FROM loans WHERE status = 'active'",
        "description": "List all active loans",
        "params": []
    },
    "listOverdueLoans": {
        "query": "SELECT * FROM loans WHERE due_date < CURRENT_DATE AND status = 'active'",
        "description": "List all overdue loans",
        "params": []
    },
    "getPaymentsByLoan": {
        "query": "SELECT * FROM payments WHERE loan_id = :loan_id ORDER BY payment_date DESC",
        "description": "Fetch all payments for a loan, newest first",
        "params": [
            "loan_id"
        ]
    },
    "getPaymentById": {
        "query": "SELECT * FROM payments WHERE id = :id",
        "description": "Fetch payment by ID",
        "params": [
            "id"
        ]
    },
    "listRecentPayments": {
        "query": "SELECT * FROM payments ORDER BY payment_date DESC LIMIT :limit",
        "description": "Fetch recent payments",
        "params": [
            "limit"
        ]
    }
};
