#!/usr/bin/env node

/**
 * Schema validation script for PocketBase collections
 * Validates the generated schema against PocketBase requirements
 */

const fs = require('fs');

function validateSchema() {
  try {
    const schemaData = fs.readFileSync('/workspace/pocketbase_collections.json', 'utf8');
    const collections = JSON.parse(schemaData);
    
    console.log('=== PocketBase Schema Validation ===\n');
    
    let errors = [];
    let warnings = [];
    
    collections.forEach((collection, index) => {
      console.log(`Validating collection: ${collection.name}`);
      
      // Check required fields
      if (!collection.id) errors.push(`Collection ${index}: Missing id`);
      if (!collection.name) errors.push(`Collection ${index}: Missing name`);
      if (!collection.type) errors.push(`Collection ${index}: Missing type`);
      if (!collection.schema) errors.push(`Collection ${index}: Missing schema`);
      
      // Validate collection types
      const validTypes = ['base', 'auth', 'view'];
      if (!validTypes.includes(collection.type)) {
        errors.push(`Collection ${collection.name}: Invalid type "${collection.type}"`);
      }
      
      // Validate schema fields
      if (collection.schema && Array.isArray(collection.schema)) {
        collection.schema.forEach((field, fieldIndex) => {
          if (!field.name) {
            errors.push(`Collection ${collection.name}, field ${fieldIndex}: Missing name`);
          }
          if (!field.type) {
            errors.push(`Collection ${collection.name}, field ${fieldIndex}: Missing type`);
          }
          
          // Validate relation fields
          if (field.type === 'relation') {
            if (!field.options || !field.options.collectionId) {
              errors.push(`Collection ${collection.name}, field ${field.name}: Relation missing collectionId`);
            }
          }
        });
      }
      
      // Check for potential issues
      if (collection.name === 'notifications' && collection.schema) {
        const hasReceiverField = collection.schema.some(f => f.name === 'receiver');
        const hasSenderField = collection.schema.some(f => f.name === 'sender');
        
        if (!hasReceiverField) {
          warnings.push(`Notifications collection: Missing receiver relation field`);
        }
        if (!hasSenderField) {
          warnings.push(`Notifications collection: Missing sender relation field`);
        }
      }
      
      console.log(`  ✓ Collection ${collection.name} structure valid`);
    });
    
    console.log(`\n=== Validation Results ===`);
    console.log(`Collections validated: ${collections.length}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    if (errors.length === 0) {
      console.log('\n✅ Schema validation passed!');
      console.log('\nNext steps:');
      console.log('1. Follow the migration instructions in MIGRATION_INSTRUCTIONS.md');
      console.log('2. Import pocketbase_collections.json into PocketBase');
      console.log('3. Handle the notifications collection as described in the guide');
      return true;
    } else {
      console.log('\n❌ Schema validation failed! Please fix the errors above.');
      return false;
    }
    
  } catch (error) {
    console.error('Error validating schema:', error.message);
    return false;
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateSchema();
}

module.exports = { validateSchema };