// Test script to demonstrate the updated snippet update API
// This shows how the API now supports updating the type field and returns complete snippet data

const testSnippetUpdate = async () => {
    const baseUrl = 'http://localhost:3000/api/v1/snippet';

    // Example of updating a snippet with type change
    const updateData = {
        snippet_id: "your_snippet_id_here",
        keyName: "updated_key_name",
        value: "updated_value",
        type: "url" // This is now supported!
    };

    try {
        const response = await fetch(baseUrl, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer your_auth_token_here'
            },
            body: JSON.stringify(updateData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Snippet updated successfully:', result.data);
            // result.data now contains the complete updated snippet object
        } else {
            const error = await response.json();
            console.error('Failed to update snippet:', error);
        }
    } catch (error) {
        console.error('Error updating snippet:', error);
    }
};

const testSnippetCreate = async () => {
    const baseUrl = 'http://localhost:3000/api/v1/snippet';

    // Example of creating a new snippet
    const createData = {
        keyName: "new_snippet_key",
        value: "new_snippet_value",
        type: "text"
    };

    try {
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer your_auth_token_here'
            },
            body: JSON.stringify(createData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Snippet created successfully:', result.data);
            // result.data now contains the complete created snippet object
        } else {
            const error = await response.json();
            console.error('Failed to create snippet:', error);
        }
    } catch (error) {
        console.error('Error creating snippet:', error);
    }
};

// Example usage:
// testSnippetUpdate();
// testSnippetCreate();

console.log(`
Snippet API Enhancement Complete!

The snippet API now returns complete snippet data for both create and update operations:

1. CREATE Snippet (POST /api/v1/snippet):
   Response: { "data": { complete_snippet_object } }
   - Returns the newly created snippet with all fields
   - If keyName already exists, returns the existing snippet

2. UPDATE Snippet (PATCH /api/v1/snippet):
   Response: { "data": { complete_updated_snippet_object } }
   - Returns the updated snippet with all fields
   - If keyName already exists, returns the conflicting snippet

3. Snippet Object Structure:
   {
     "_id": "snippet_id",
     "user_id": "user_id",
     "keyName": "key_name",
     "value": "snippet_value",
     "type": "text|url",
     "status": "published",
     "createdAt": "timestamp",
     "updatedAt": "timestamp"
   }

4. Benefits:
   - Frontend gets complete snippet data immediately
   - No need for additional API calls to fetch snippet details
   - Consistent response format across create/update operations
   - Better error handling with actual snippet data

5. Usage Examples:
   POST /api/v1/snippet - Create new snippet
   PATCH /api/v1/snippet - Update existing snippet (including type changes)
   GET /api/v1/snippet?snippet_id=id - Get specific snippet

The API maintains all existing functionality while providing richer responses with complete snippet data.
`);
