import { z } from "zod";

export function extractValidationErrors(err) {
    if (!err || !err.errors) return { error: "Unknown validation error" };

    const missingFields = new Set();
    const invalidFields = new Set();

    function flattenErrors(errors, parentPath = []) {
        for (const e of errors) {
            const currentPath = [...parentPath, ...(e.path || [])].join('.') || "(root)";

            if (e.code === 'invalid_union' && e.unionErrors) {
                e.unionErrors.forEach(ue => flattenErrors(ue.issues, parentPath));
            } else if (e.issues) {
                flattenErrors(e.issues, parentPath);
            } else {
                if (e.code === 'invalid_type' || e.code === 'custom') {
                    invalidFields.add(`${currentPath} (${e.message})`);
                } else if (e.code === 'invalid_literal' || e.code === 'invalid_enum_value' || e.code === 'required') {
                    missingFields.add(currentPath);
                } else {
                    invalidFields.add(`${currentPath} (${e.message})`);
                }
            }
        }
    }

    flattenErrors(err.errors);

    return {
        missingFields: Array.from(missingFields),
        invalidFields: Array.from(invalidFields)
    };
}

export function parseAndValidateResponse(content, schema) {
    try {
        const parsed = JSON.parse(content);
        return schema.parse(parsed);
    } catch (err) {
        if (err instanceof SyntaxError) throw new Error(`JSON parsing error: ${err.message}`);
        if (err instanceof z.ZodError) throw err;
        throw err;
    }
}
