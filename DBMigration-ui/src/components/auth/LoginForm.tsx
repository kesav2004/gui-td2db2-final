
import { useState, useContext } from "react";
import {
  Form,
  FormGroup,
  TextInput,
  Button,
  InlineNotification,
} from "@carbon/react";
//import { AuthContext } from "../../App";
import { useNavigate } from "react-router-dom";
import IBMLogo from "../icons/IBMLogo";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Both email and password are required");
      return;
    }
    
    // const success = login(email, password);
    // if (success) {
     // navigate("/");
    //} else {
      //setError("Login failed. Please check your credentials.");
    //}
 };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-4">
            <IBMLogo className="h-10 w-10" />
            <span className="text-2xl font-bold text-gray-900">
              Database Migration
            </span>
          </div>
        </div>
        
        {error && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={error}
            role="alert"
            onCloseButtonClick={() => setError("")}
            hideCloseButton={true}
            style={{ marginBottom: '1rem' }}
          />
        )}

        <Form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <FormGroup legendText="Login credentials">
              <TextInput
                id="email"
                labelText="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <TextInput
                id="password"
                labelText="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </FormGroup>
            
            <Button type="submit" kind="primary" size="md" style={{ width: '100%' }}>
              Log in
            </Button>
            
          
          </div>
        </Form>
      </div>
    </div>
  );
};

export default LoginForm;
