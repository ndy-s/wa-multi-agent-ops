
export const apiRegistry = {
    "LNO8888C.SVC": {
        description: "Loan creation API",
        fields: {
            prdCode: {
                required: true,
                type: "string",
                enum: ["11010009001001", "11010009001002", "13030009001001", "13030009001002", "13030009001012"],
                mapping: {
                    "QC-GENERAL": "11010009001001",
                    "QC-PREMIUM": "11010009001002",
                    "KTA-GENERAL": "13030009001001",
                    "KTA-PREMIUM": "13030009001002",
                    "KTA-PAYROLL": "13030009001012"
                },
                instructions: "Map product name to prdCode. Required."
            },
            custNo: {
                required: true,
                type: "string",
                instructions: "Customer number, must be provided."
            },
            lonTerm: {
                required: true,
                type: "string",
                instructions: "Loan term in months. Required."
            },
            repayPlan: {
                required: true,
                type: "string",
                enum: ["MONTHLY", "QUARTERLY"],
                instructions: "Repayment plan must be one of MONTHLY or QUARTERLY."
            },
            limitAmt: {
                required: true,
                type: "string",
                instructions: "Loan limit amount."
            },
            riskSeg: {
                required: false,
                type: "string",
                instructions: "Optional: risk segment code."
            },
            grade: {
                required: false,
                type: "string",
                instructions: "Optional: customer grade."
            },
            groupCd: {
                required: false,
                type: "string",
                instructions: "Optional: group code."
            },
            excludeStep: {
                required: false,
                type: "array",
                items: {
                    type: "string",
                    enum: ["SAVE", "CONT", "VERI"]
                },
                instructions: "List of process steps to exclude during API execution."
            }
        },
        examples: [
            {
                input: "Create QC-GENERAL loan for customer 12345 with 12 months, monthly repayment, 5,000,000 limit",
                output: {
                    id: "LNO8888C.SVC",
                    params: {
                        prdCode: "11010009001001",
                        custNo: "12345",
                        lonTerm: "12",
                        repayPlan: "MONTHLY",
                        limitAmt: "5000000"
                    }
                }
            }
        ]
    },

    "LNO8888D.SVC": {
        description: "Portfolio manipulation API",
        fields: {
            pgmType: {
                required: true,
                type: "string",
                enum: ["11", "12", "31", "32", "33"],
                mapping: {
                    "QC-EXTEND": "11",
                    "KTA-REPEAT": "12",
                    "KTA-TOP-UP": "31",
                    "KTA-INCREASE-LIMIT": "32",
                    "QC-INCREASE-LIMIT": "33"
                },
                instructions: "Map product name to pgmType."
            },
            refNo: {
                required: true,
                type: "string",
                format: "startsWith1188",
                instructions: "Reference number must start with 1188."
            }
        },
        examples: [
            {
                input: "Extend portfolio for customer 12345",
                output: {
                    id: "LNO8888D.SVC",
                    params: {
                        pgmType: "11",
                        refNo: "118812345"
                    }
                }
            }
        ]
    }
};
