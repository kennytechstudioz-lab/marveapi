import Term from '../models/Term';
import mongoose from 'mongoose';

const defaultTerms = [
    {
        title: 'Terms and Conditions',
        type: 'terms',
        content: `<h1>Terms and Conditions</h1>
        <p>Welcome to Marvelous Housing.</p>
        <p>By registering on this platform, you agree to abide by our terms and conditions. We reserve the right to modify these terms at any time.</p>
        <h2>1. User Obligations</h2>
        <p>Users must provide accurate information during registration and maintain the confidentiality of their accounts.</p>
        <h2>2. Listing Rules</h2>
        <p>All property listings must be accurate, legal, and belong to the user posting them.</p>`,
        isActive: true
    },
    {
        title: 'Privacy Policy',
        type: 'privacy',
        content: `<h1>Privacy Policy</h1>
        <p>Your privacy is important to us at Marvelous Housing.</p>
        <h2>1. Data Collection</h2>
        <p>We collect personal information such as your name, email address, and phone number when you register.</p>
        <h2>2. Data Usage</h2>
        <p>Your data is used to provide you with a personalized experience and to communicate updates about our services.</p>
        <h2>3. Data Protection</h2>
        <p>We implement industry-standard security measures to protect your personal data from unauthorized access.</p>`,
        isActive: true
    }
];

export const seedTerms = async () => {
    try {
        const count = await Term.countDocuments();
        if (count === 0) {
            console.log('Seeding initial Terms and Privacy Policy...');
            await Term.insertMany(defaultTerms);
            console.log('Terms seeded successfully.');
        }
    } catch (error) {
        console.error('Error seeding terms:', error);
    }
};
