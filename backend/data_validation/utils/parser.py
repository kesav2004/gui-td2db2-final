import io, json, re, sqlparse

class parser:

    # function to return table name from DDL
    # Get the table name by looking at the tokens in reverse order till you find a token with None type
    def get_token_none(self, tokens):
        for token in reversed(tokens):
            if token.ttype is None:
                return token.value
        return " "

    # function to return keyword of the DDL stmt like table or index etc.
    def get_token_keyword(self, tokens):
        for token in tokens:
            if token.ttype == sqlparse.tokens.Keyword:
                return token.value
        return " "

    # main function to parse the DDL for the table, fields, pk etc.
    def parse_ddl(self, parse_line):

        result = {}
        try:
            # loop thru each ddl statement
            for stmt in parse_line:
                # Get all the tokens except whitespaces
                tokens = [t for t in sqlparse.sql.TokenList(stmt.tokens) if t.ttype != sqlparse.tokens.Whitespace]
                is_create_stmt = False
                is_alter_stmt = False
                for i, token in enumerate(tokens):

                    # Is it a create statements ?
                    if token.match(sqlparse.tokens.DDL, 'CREATE'):
                        is_create_stmt = True
                        continue
                    elif token.match(sqlparse.tokens.DDL, 'ALTER'):
                        is_alter_stmt = True
                        continue

                    # If it was a create statement and the current token starts with "("
                    if is_create_stmt and token.value.startswith("("):

                        keyword = self.get_token_keyword(tokens[:i])
                        if keyword not in ['TABLE', 'UNIQUE']:
                            break;

                        user_table = self.get_token_none(tokens[:i])
                        user = user_table.replace('"', '').split('.')[0]
                        table = user_table.replace('"', '').split('.')[1]
                        #print(f"table: {table} user: {user}")


                        if keyword == 'TABLE':
                            # Now parse the columns
                            txt = token.value
                            columns_txt = txt[1:txt.rfind(")")].replace("\n","").split(",")
                            columns = []
                            coltype = {}
                            schema = {}
                            schema['_keys_'] = []
                            schema['_user_'] = user

                            for column in columns_txt:
                                try:
                                    c = ' '.join(column.split()).split()
                                    c_name = c[0].replace('\"',"")
                                    if c_name.find(')') > 0:
                                        continue

                                    c_type = re.sub('[0-9]', '', c[1]).replace('(', '').replace(')', '')
                                    columns.append(c_name)
                                    coltype[c_name] = c_type
                                    #print (f"column/type: {c_name} {c_type}")
                                except Exception as error:
                                    #print('Exception : ' + str(error))
                                    continue

                            #print (columns)
                            schema['_columns_'] = columns
                            schema['_coltype_'] = coltype
                            result[table] = schema
                            #print ("---"*20)
                        else:
                            # unique index
                            txt = token.value
                            columns_txt = txt[1:txt.rfind(")")].replace("\n","").split(",")
                            columns = []

                            for column in columns_txt:
                                try:
                                    c = ' '.join(column.split()).split()
                                    c_name = c[0].replace('\"',"")
                                    columns.append(c_name)
                                except Exception as error:
                                    #print('Exception : ' + str(error))
                                    continue

                            result[table]['_keys_'] = columns

                        break

        except Exception as error:
            print('Exception : ' + str(error))

        return result